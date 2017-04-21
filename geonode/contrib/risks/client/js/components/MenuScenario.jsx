/**
 * Copyright 2017, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

const React = require('react');

const MenuScenario = React.createClass({
    propTypes: {
        dimensions: React.PropTypes.array,
        dim: React.PropTypes.object,
        setDimIdx: React.PropTypes.func
    },
    getDefaultProps() {
        return {
            dimensions: [],
            dim: {},
            setDimIdx: () => {}
        };
    },
    getScenarios(values, current) {
        return values.map((val, idx) => {
            return val === current ? null : (<li key={idx} onClick={() => { this.props.setDimIdx('dim1Idx', idx); }}><a href="#">{val}</a></li>);
        });
    },
    render() {
        const {dimensions, dim} = this.props;
        const values = dimensions[dim.dim1].values;
        const current = values[dim.dim1Idx];
        const resource = dimensions[dim.dim1].layers[current].resource;
        return (
            <div>
                <div className="text-center slider-lab" style={{backgroundColor: '#fff', color: '#2c689c', fontWeight: 'bold'}}>
                    {dimensions[dim.dim1].name + ' ' + current}
                </div>
                <div style={{marginTop: 20}}>{resource.text}</div>
                <hr style={{border: '1px dashed #ddd'}}/>
                <div style={{fontWeight: 'bold', marginBottom: 20}}>{resource.title}</div>
                <a target="_blank" href={resource.details}>
                    <div className="row" style={{width: '100%'}}>
                      <div className="col-xs-2"><i className="fa fa-dot-circle-o" /></div>
                      <div className="col-xs-10">{resource.abstract}</div>
                    </div>
                </a>
                <br/>
                <hr/>
                <div style={{fontWeight: 'bold', marginBottom: 20}}>{'Select a different Scenario'}</div>
                <ul className="nav nav-pills">
                  {this.getScenarios(values, current)}
                </ul>
            </div>
        );
    }
});

module.exports = MenuScenario;
