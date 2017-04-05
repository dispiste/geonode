/**
 * Copyright 2017, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

const React = require('react');
const Nouislider = require('react-nouislider');
const {connect} = require('react-redux');
const {show, hide} = require('react-notification-system-redux');
const {mapLabelSelector} = require('../selectors/disaster');
const LabelResource = connect(mapLabelSelector, { show, hide })(require('../components/LabelResource'));

const AxesSelector = React.createClass({
    propTypes: {
        dimension: React.PropTypes.object,
        activeAxis: React.PropTypes.number,
        setDimIdx: React.PropTypes.func
    },
    getDefaultProps() {
        return {
            activeAxis: 0,
            setDimIdx: () => {}
        };
    },
    render() {
        const {name = '', values = []} = this.props.dimension || {};
        const label = !this.props.dimension ? null : (
            <div className="text-center slider-box">
                <LabelResource uid={'map_label_tab'} label={name + ' ' + values[this.props.activeAxis]} dimension={this.props.dimension}/>
            </div>);
        return !this.props.dimension || values.length - 1 === 0 ? label : (
            <div className="text-center slider-box">
                <LabelResource uid={'map_label_tab'} label={name + ' ' + values[this.props.activeAxis]} dimension={this.props.dimension}/>
                <Nouislider
                    range={{min: 0, max: values.length - 1}}
                    start={[this.props.activeAxis]}
                    step={1}
                    tooltips={false}
                    onChange={(idx) => this.props.setDimIdx('dim2Idx', Number.parseInt(idx[0]))}
                    pips= {{
                        mode: 'steps',
                        density: 20,
                        format: {
                            to: (value) => {
                                let val = values[value].split(" ")[0];
                                return val.length > 8 ? val.substring(0, 8) + '...' : val;
                            },
                            from: (value) => {
                                return value;
                            }
                        }
                    }}/>
            </div>);
    }
});

module.exports = AxesSelector;
