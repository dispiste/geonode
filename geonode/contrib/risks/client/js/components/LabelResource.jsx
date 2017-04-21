/**
 * Copyright 2017, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

const React = require('react');
const {isObject} = require('lodash');

const LabelResource = React.createClass({
    propTypes: {
        uid: React.PropTypes.string,
        currentUrl: React.PropTypes.string,
        label: React.PropTypes.string,
        show: React.PropTypes.func,
        hide: React.PropTypes.func,
        notifications: React.PropTypes.array,
        dimension: React.PropTypes.object,
        getData: React.PropTypes.func
    },
    getDefaultProps() {
        return {
            uid: 'label_tab',
            currentUrl: '',
            label: '',
            show: () => {},
            hide: () => {},
            notifications: [],
            dimension: {},
            getData: () => {}
        };
    },
    getDataAttributes(data) {
        const attributes = Object.keys(data);
        attributes.sort();
        const match = ['name', 'abstract', 'unit'];
        return attributes.filter((val) => {
            return match.indexOf(val) !== -1;
        }).map((item, idx) => {
            let obj = data[item];
            return obj !== "" && obj !== null ? (
              <div key={idx}>
                  <div className="disaster-more-info-even">{item}</div>
                  {isObject(obj) ? (<div className="disaster-more-info-table-nested">{this.getDataAttributes(obj)}</div>) : (<div className="disaster-more-info-odd">{obj}</div>)}
              </div>
          ) : null;
        });
    },
    render() {
        const {uid, dimension, label, notifications} = this.props;
        const notification = notifications.filter((v) => {return v.uid === uid; });
        const url = this.props.currentUrl + 'dym/' + dimension.id;
        const active = notification.length > 0 ? ' active' : '';
        const title = (<h4 className="text-center">{dimension.name}</h4>);
        const head = (<div><div className="disaster-more-info-table">{this.getDataAttributes(dimension)}</div></div>);
        const element = (
          <div className="disaster-more-info-table-notification">
              <h4 className="text-center">{dimension.name}</h4>
              <div className="disaster-more-info-table-container">
                  <div className="disaster-more-info-table">
                      {this.getDataAttributes(dimension)}
                  </div>
                  <button className={"btn btn-primary"} onClick={() => { this.props.getData(url, uid, title, head); }}>
                      <i className="fa fa-ellipsis-h"/>&nbsp;{'More info'}
                  </button>
              </div>
          </div>
        );
        return (
            <button className={"text-center btn slider-lab" + active} onClick={() => { return notification.length === 0 ? this.props.show({uid, position: 'bc', /*dismissible: false,*/ autoDismiss: 0, children: element}, 'info') : this.props.hide(uid); }}>
                {label}
            </button>
        );
    }
});

module.exports = LabelResource;
