#!/usr/bin/env python
# -*- coding: utf-8 -*-
from __future__ import print_function
import logging

from django.conf import settings
from django import forms
from django.views.generic import TemplateView, View, FormView

from geonode.layers.models import Layer
from geonode.utils import json_response
from geonode.contrib.risks.models import (HazardType, AdministrativeDivision,
                                          RiskAnalysisDymensionInfoAssociation, 
                                          RiskAnalysis, DymensionInfo, AnalysisType,
                                          FurtherResource)

from geonode.contrib.risks.datasource import GeoserverDataSource

cost_benefit_index = TemplateView.as_view(template_name='risks/cost_benefit_index.html')

log = logging.getLogger(__name__)


class ContextAware(object):

    CONTEXT_KEYS = ['ht', 'at', 'an', 'dym']

    def get_context_url(self, **kwargs):
        out = []
        for k in self.CONTEXT_KEYS:
            if kwargs.get(k):
                out.extend([k, kwargs[k]])
            else:
                break
        if out:
            url = '{}/'.format('/'.join(out))
        else:
            url = None
        return url

    def fr_for_an(self, an, **kwargs):
        """
        .. py:method: ft_for_an(an, **kwargs)

        :param an: Risk Analysis object
        :param dict kwargs: other parameters available
        :type an: :py:class: geonode.contrib.risks.models.RiskAnalysis

        Returns list of :py:class: geonode.contrib.risks.models.FurtherResource 
            related to Hazard type (assigned to Risk Analysis). Region may be used to narrow results.
        
        """
        if an.hazardset is None:
            return []
        region = None
        if kwargs.get('loc'):
            region = kwargs['loc'].region

        return FurtherResource.for_hazard_set(an.hazardset, region=region)


    def fr_for_dym(self, dym, **kwargs):
        """
        .. py:method: fr_for_dym(dym, **kwargs)
        
        :param dym: DymensionInfo object
        :param dict kwargs: other parameters for query
        :type dym: :py:class: geonode.contrib.risks.models.DymensionInfo

        Returns list of :py:class: geonode.contrib.risks.models.FurtherResource 
            related to DymensionInfo. Region and Risk Analysis may be used to 
            narrow results.
        """


        if dym is None:
            return []
        ranalysis = kwargs.get('ra')        
        region = None
        if kwargs.get('loc'):
            region = kwargs['loc'].region
        return FurtherResource.for_dymension_info(dym, region=region, ranalysis=ranalysis)


    def fr_for_at(self, at, **kwargs):
        """
        .. py:method: fr_for_at(dym, **kwargs)
        
        :param at: AnalysisType object
        :param dict kwargs: other parameters for query
        :type dym: :py:class: geonode.contrib.risks.models.DymensionInfo

        Returns list of :py:class: geonode.contrib.risks.models.FurtherResource 
            related to DymensionInfo. Region and Risk Analysis may be used to 
            narrow results.
        """
        if at is None:
            return []
        htype = kwargs.get('ht')
        region = None
        if kwargs.get('loc'):
            region = kwargs['loc'].region
        return FurtherResource.for_analysis_type(at, region=region, htype=htype)


    # maps url captured argument to specific class and field for lookup
    CONTEXT_KEYS_CLASSES = (('ht', HazardType, 'mnemonic'),
                            ('at', AnalysisType, 'name',),
                            ('an', RiskAnalysis, 'id',),
                            ('dym', DymensionInfo, 'id',),
                            ('loc', AdministrativeDivision, 'code',)
                            )


    def get_further_resources_inputs(self, **kwargs):
        """
        .. py:method:: get_further_resources_inputs(self, **kwargs)

        :param dict kwargs: keyword arguments obtained from url parser
        :return: dictionary with objects for keyword and criteria

        This will check each pair of (key, value) from url kwargs and, 
        using map between key and class, will get specific object identified
        by value.

        """

        out = {}
        for k, klass, field in self.CONTEXT_KEYS_CLASSES:
            if not kwargs.get(k):
                continue
            related = self._get_from_kwargs(klass, field, kwargs[k])
            out[k] = related
        return out

    def get_further_resources(self, **kwargs):
        """
        .. py:method:: get_further_resources(self, **kwargs)

        returns map of criteria and further resources available for given criteria

        :param dict kwargs: keyword arguments obtained from url parser (see CONTEXT_KEY_CLASSES)
        :return: dictionary with object type name and list of related resources
        :rtype: dict
        
        """
        inputs = self.get_further_resources_inputs(**kwargs)
        out = {}
        for res_type, key_name in (('at', 'analysisType',),
                                    ('dym', 'hazardSet',),
                                    ('an', 'hazardType',)):
            res_type_handler = getattr(self, 'fr_for_{}'.format(res_type))
            if kwargs.get(res_type):
                out[key_name] = self._fr_serialize(res_type_handler(**inputs))
        return out


    def _fr_serialize(self, items):
        return [i.export() for i in items]

    def _get_from_kwargs(self, klass, field, field_val):
        return klass.objects.get(**{field: field_val})
        

class FeaturesSource(object):

    AXIS_X = 'x'
    AXIS_Y = 'y'
    KWARGS_MAPPING = {'loc': 'adm_code',
                      'ht': 'hazard_type'}

    def url_kwargs_to_query_params(self, **kwargs):
        out = {}
        for k, v in kwargs.iteritems():
            if self.KWARGS_MAPPING.get(k):
                new_k = self.KWARGS_MAPPING[k]
                out[new_k] = v
        return out

    def get_dim_association(self, analysis, dyminfo):
        ass_list = RiskAnalysisDymensionInfoAssociation.objects.filter(riskanalysis=analysis, dymensioninfo=dyminfo)
        dim_list = set([a.axis_to_dim() for a in ass_list])
        if len(dim_list) != 1:
            raise ValueError("Cannot query more than one dimension at the moment, got {}".format(len(dim_list)))

        return (ass_list.first(), list(dim_list)[0])

    def get_dymlist_field_mapping(self, analysis, dimension, dymlist):
        out = []
        layers = []
        current_dim_name = self.get_dim_association(analysis, dimension)[1]
        out.append(current_dim_name)
        for dym in dymlist:
            if dym != dimension:
                dim_association = self.get_dim_association(analysis, dym)
                if dim_association[0].layer:
                    layers.append(dim_association[0].layer.typename)
                out.append(dim_association[1])
        return (out, layers)

    def get_features(self, analysis, dimension, dymlist, **kwargs):

        (dymlist_to_fields, dym_layers) = self.get_dymlist_field_mapping(analysis, dimension, dymlist)

        s = settings.OGC_SERVER['default']
        gs = GeoserverDataSource('{}/wfs'.format(s['LOCATION'].strip("/")),
                                 username=s['USER'],
                                 password=s['PASSWORD'])
        dim_name = dymlist_to_fields[0]
        layer_name = dym_layers[0]

        features = gs.get_features(layer_name, dim_name, **kwargs)
        return features


class RiskDataExtractionView(FeaturesSource, TemplateView):

    template_name = 'risks/risk_data_extraction_index.html'


risk_data_extraction_index = RiskDataExtractionView.as_view()


class LocationSource(object):

    def get_location(self, **kwargs):
        try:
            loc = AdministrativeDivision.objects.get(code=kwargs['loc'])
        except AdministrativeDivision.DoesNotExist:
            return
        locations = loc.get_parents_chain() + [loc]
        return locations


class LocationView(ContextAware, LocationSource, View):

    def get(self, request, *args, **kwargs):
        locations = self.get_location(**kwargs)
        if not locations:
            return json_response(errors=['Invalid location code'], status=404)
        loc = locations[-1]
        hazard_types = HazardType.objects.all()

        location_data = {'navItems': [location.export() for location in locations],
                         'context': self.get_context_url(**kwargs),
                         'furtherResources': self.get_further_resources(**kwargs),
                         'overview': [ht.set_location(loc).export() for ht in hazard_types]}

        return json_response(location_data)


class HazardTypeView(ContextAware, LocationSource, View):
    """
    loc/AF/ht/EQ/"
{
 "navItems": [{
  "label": "Afghanistan",
  "href": "http://disasterrisk-af.geo-solutions.it/risks/risk_data_extraction/loc/AF/ht/EQ/at/loss_impact/"
 }, {
  "label": "Badakhshan",
  "href": "http://disasterrisk-af.geo-solutions.it/risks/risk_data_extraction/loc/AF15/ht/EQ/at/loss_impact/",
 }],
 "overview": [{
  "mnemonic": "EQ",
  "title": "Earthquake",
  "riskAnalysis": 2,
  "href": "http://disasterrisk-af.geo-solutions.it/risks/risk_data_extraction/loc/AF15/ht/EQ/at/loss_impact/",
 }, {
  "mnemonic": "FL",
  "title": "River Flood",
  "riskAnalysis": 0,
  "href": "http://disasterrisk-af.geo-solutions.it/risks/risk_data_extraction/loc/AF15/ht/FL/at/loss_impact/"
 }],
    "hazardType": {
        "mnemonic": "EQ",
        "description": "Lorem ipsum dolor, .....",
        "analysisTypes"[{
            "name": "loss_impact",
            "title": "Loss Impact",
            "href": "http://disasterrisk-af.geo-solutions.it/risks/risk_data_extraction/loc/AF15/ht/EQ/at/loss_impact/"
        }, {
            "name": "impact",
            "title": "Impact Analysis",
            "href": "http://disasterrisk-af.geo-solutions.it/risks/risk_data_extraction/loc/AF15/ht/EQ/at/impact/"
        }]
    },
    "analysisType":{
        "name": "impact",
        "description": "Lorem ipsum dolor, .....",
        "riskAnalysis": [{
            "name": "WP6_future_proj_Hospital",
            "hazardSet": {
                "title": "Afghanistan Hazard-Exposures for provinces and districts for affected hospitals in future projections for SSPs 1-5 in 2050.",
                "abstract": "This table shows the aggregated results of affected hospitals for the Afghanistan districts and provinces from 1km resolution results in the locations over PGA=0.075g. These are measured in USD. The results are created as future projections for SSPs 1-5 in 2050.",
                "category": "economic",
                "fa_icon": "fa_economic"
            },
            "href": "http://disasterrisk-af.geo-solutions.it/risks/risk_data_extraction/loc/AF15/ht/EQ/at/impact/an/1/"
        }, {
            ...,
            "href": "http://disasterrisk-af.geo-solutions.it/risks/risk_data_extraction/loc/AF15/ht/EQ/at/impact/an/2/"
        }
        ]
    }



    """

    def get_hazard_type(self, location, **kwargs):
        try:
            return HazardType.objects.get(mnemonic=kwargs['ht']).set_location(location)
        except (KeyError, HazardType.DoesNotExist,):
            return

    def get_analysis_type(self, location, hazard_type, **kwargs):

        atypes = hazard_type.get_analysis_types()
        if not atypes.exists():
            return None, None,
        if not kwargs.get('at'):
            atype = atypes.first().set_location(location).set_hazard_type(hazard_type)
        else:
            atype = atypes.get(name=kwargs['at']).set_location(location).set_hazard_type(hazard_type)
        return atype, atypes,

    def get(self, request, *args, **kwargs):
        locations = self.get_location(**kwargs)
        if not locations:
            return json_response(errors=['Invalid location code'], status=404)
        loc = locations[-1]
        hazard_types = HazardType.objects.all()

        hazard_type = self.get_hazard_type(loc, **kwargs)

        if not hazard_type:
            return json_response(errors=['Invalid hazard type'], status=404)

        (atype, atypes,) = self.get_analysis_type(loc, hazard_type, **kwargs)
        if not atype:
            return json_response(errors=['No analysis type available for location/hazard type'], status=404)

        out = {'navItems': [location.export() for location in locations],
               'overview': [ht.set_location(loc).export() for ht in hazard_types],
               'context': self.get_context_url(**kwargs),
               'furtherResources': self.get_further_resources(**kwargs),
               'hazardType': hazard_type.get_hazard_details(),
               'analysisType': atype.get_analysis_details()}

        return json_response(out)


class DataExtractionView(FeaturesSource, HazardTypeView):
    """

{
    "riskAnalysisData": {
        "name": "",
        "descriptorFile": "",
        "dataFile": "",
        "metadataFile": "",
        "hazardSet": {
            "title": "",
            "abstract": "",
            "purpose": "",
            "category": "",
            ... other metadata ...
        },
        "data": {
            "dimensions": [
                {
                    "name": "Scenario",
                    "abstract": "Lorem ipsum dolor,...",
                    "unit": "NA",
                    "values": [
                        "Hospital",
                        "SSP1",
                        "SSP2",
                        "SSP3",
                        "SSP4",
                        "SSP5"
                    ]
                },
                {
                    "name": "Round Period",
                    "abstract": "Lorem ipsum dolor,...",
                    "unit": "Years",
                    "values": [
                        "10",
                        "20",
                        "50",
                        "100",
                        "250",
                        "500",
                        "1000",
                        "2500"
                    ]
                }
            ],
            "values":[
                ["Hospital","10",0.0],
                ["Hospital","20",0.0],
                ["Hospital","50",0.0],
                ["Hospital","100",0.0],
                ["Hospital","250",6000000.0],
                ["Hospital","500",6000000.0],
                ["Hospital","1000",6000000.0],
                ["Hospital","2500",6000000.0],

                ["SSP1","10",0.0],
                ["SSP1","20",0.0],
                ["SSP1","50",0.0],
                ["SSP1","100",64380000.0],
                ["SSP1","250",64380000.0],
                ["SSP1","500",64380000.0],
                ["SSP1","1000",64380000.0],
                ["SSP1","2500",64380000.0],

                ...
            ]
        }
    }
}

    """

    def reformat_features(self, risk, dimension, dimensions, features):
        """
        Returns risk data as proper structure

        """
        values = []
        dims = [dimension.set_risk_analysis(risk)] + [d.set_risk_analysis(risk) for d in dimensions if d.id != dimension.id]

        _fields = [self.get_dim_association(risk, d) for d in dims]
        fields = ['{}_value'.format(f[1]) for f in _fields]

        orders = [dict(d.get_axis_order()) for d in dims]

        orders_len = len(orders)

        def make_order_val(feat):
            """
            compute order value
            """
            _order_vals = []
            
            for idx, o in enumerate(orders):
                field_name = fields[idx]
                val = feat['properties'].get(field_name)
                order_val = o.get(val)
                if order_val is None:
                    order_val = 1000
                # 111 > 1, 1, 1
                mag = 10 ** (orders_len - idx)
                _order_vals.append('{}'.format(order_val * mag))
            return ''.join(_order_vals)

        def order_key(val):
            # order by last val
            return val.pop(-1)

        for feat in features:
            p = feat['properties']
            line = []
            [line.append(p[f]) for f in fields]
            line.append(p['value'])
            line.append(make_order_val(feat))
            values.append(line)

        values.sort(key=order_key)

        out = {'dimensions': [dim.set_risk_analysis(risk).export() for dim in dims],
               'values': values}

        return out

    def get(self, request, *args, **kwargs):
        locations = self.get_location(**kwargs)
        if not locations:
            return json_response(errors=['Invalid location code'], status=404)
        loc = locations[-1]

        hazard_type = self.get_hazard_type(loc, **kwargs)

        if not hazard_type:
            return json_response(errors=['Invalid hazard type'], status=404)

        (atype, atypes,) = self.get_analysis_type(loc, hazard_type, **kwargs)
        if not atype:
            return json_response(errors=['No analysis type available for location/hazard type'], status=404)

        risks = atype.get_risk_analysis_list(id=kwargs['an'])
        if not risks:
            return json_response(errors=['No risk analysis found for given parameters'], status=404)
        risk = risks[0]

        out = {'riskAnalysisData': risk.get_risk_details()}
        dymlist = risk.dymension_infos.all().distinct()
        if kwargs.get('dym'):
            dimension = dymlist.get(id=kwargs['dym'])
        else:
            dimension = dymlist.filter(riskanalysis_associacion__axis=self.AXIS_X).distinct().get()

        feat_kwargs = self.url_kwargs_to_query_params(**kwargs)
        feat_kwargs['risk_analysis'] = risk.name
        features = self.get_features(risk, dimension, dymlist, **feat_kwargs)
        out['riskAnalysisData']['data'] = self.reformat_features(risk, dimension, dymlist, features['features'])
        out['context'] = self.get_context_url(**kwargs)
        out['wms'] = {'style': None,
                      'viewparams': self.get_viewparams(risk, hazard_type, loc),
                      'baseurl': settings.OGC_SERVER['default']['PUBLIC_LOCATION']}

        out['riskAnalysisData']['additionalLayers'] = [(l.id, l.typename,) for l in risk.additional_layers.all()]
        out['furtherResources'] = self.get_further_resources(**kwargs)
        return json_response(out)

    def get_viewparams(self, risk, htype, loc):
        return 'ra:{};ha:{};adm_code:{};d1:{{}};d2:{{}}'.format(risk.name, htype.mnemonic, loc.code)


class LayersListForm(forms.Form):
    layers = forms.MultipleChoiceField(required=False, choices=())

    def get_layers(self):
        if not self.is_valid():
            return []
        d = self.cleaned_data
        return Layer.objects.filter(id__in=d['layers'])


class RiskLayersView(FormView):
    form_class = LayersListForm

    def get_risk(self):
        rid = self.kwargs['risk_id']
        try:
            return RiskAnalysis.objects.get(id=rid)
        except RiskAnalysis.DoesNotExist:
            pass

    def get_layer_choices(self):
        r = self.get_risk()
        r_layers = r.dymensioninfo_associacion.all().values_list('layer__id', flat=True)
        if r is None:
            q = Layer.objects.all().values_list('id', flat=True)
        else:
            q = Layer.objects.exclude(id__in=r_layers).values_list('id', flat=True)

        return [(str(val), str(val),) for val in q]

    def get_form(self, form_class=None):
        f = super(RiskLayersView, self).get_form(form_class)
        choices = self.get_layer_choices()
        f.fields['layers'].choices = choices
        return f
        

    def form_invalid(self, form):
        err = form.errors
        return json_response({'errors': err}, status=400)

    def form_valid(self, form):
        rid = self.kwargs['risk_id']
        risk = self.get_risk()
        if risk is None:
            return json_response({'errors': ['Invalid risk id']}, status=404)

        data = form.cleaned_data

        risk.additional_layers.clear()
        layers = form.get_layers()
        risk.additional_layers.add(*layers)
        risk.save()
        return self.get()


    def get(self, *args, **kwargs):
        rid = self.kwargs['risk_id']
        risk = self.get_risk()
        if risk is None:
            return json_response({'errors': ['Invalid risk id']}, status=404)
        out = {}
        out['success'] = True
        out['data'] = {'layers': list(risk.additional_layers.all().values_list('typename', flat=True))}
        print('out', out)
        return json_response(out)
        
        
location_view = LocationView.as_view()
hazard_type_view = HazardTypeView.as_view()
analysis_type_view = HazardTypeView.as_view()
data_extraction = DataExtractionView.as_view()

risk_layers = RiskLayersView.as_view()