/**
 * Copyright 2017, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

const React = require('react');
const {connect} = require('react-redux');
const {Brush, LineChart, ReferenceLine, Line, XAxis, Tooltip, YAxis, CartesianGrid, ResponsiveContainer} = require('recharts');
const {Panel} = require('react-bootstrap');
const {mapSliderSelector} = require('../selectors/disaster');
const {chartSliderUpdate, setDimIdx} = require('../actions/disaster');
const ExtendedSlider = connect(mapSliderSelector, {setDimIdx, chartSliderUpdate})(require('../components/ExtendedSlider'));
const ChartTooltip = require("./ChartTooltip");
// const values = require('../../assets/mockUpData/costValue');

const CustomizedYLable = (props) => {
    const {y, lab, viewBox} = props;
    return (
        <g>
            <text x={viewBox.width / 2} y={y} dy={-25} dx={0} textAnchor="middle" fill="#666" transform="rotate(0)">{lab}</text>
        </g>
    );
};

const SliderChart = React.createClass({
    propTypes: {
        uid: React.PropTypes.string,
        labelUid: React.PropTypes.string,
        type: React.PropTypes.string,
        dimension: React.PropTypes.array,
        dim: React.PropTypes.object,
        values: React.PropTypes.array,
        val: React.PropTypes.string,
        uOm: React.PropTypes.string,
        maxLength: React.PropTypes.number,
        sliders: React.PropTypes.object,
        setDimIdx: React.PropTypes.func,
        chartSliderUpdate: React.PropTypes.func
    },
    getDefaultProps() {
        return {
            uid: '',
            labelUid: '',
            type: 'line',
            maxLength: 10,
            sliders: {},
            setDimIdx: () => {},
            chartSliderUpdate: () => {}
        };
    },
    componentDidUpdate() {
        const startIndex = this.props.sliders[this.props.uid] ? this.props.sliders[this.props.uid].startIndex : 0;
        const endIndex = this.props.sliders[this.props.uid] ? this.props.sliders[this.props.uid].endIndex : this.props.maxLength - 1;
        if (startIndex === endIndex) {
            this.props.chartSliderUpdate({startIndex, endIndex: startIndex + 1}, this.props.uid);
        }
    },
    getChartData() {
        const {dim, values, val} = this.props;
        return values.filter((d) => d[dim.dim1] === val ).map((v) => {return {"name": v[dim.dim2], "value": parseFloat(v[2], 10)}; });
    },
    renderChart(chartData) {
        const {dim, dimension, uOm} = this.props;
        return (
            <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} onClick={this.handleClick} margin={{top: 20, right: 30, left: 30, bottom: 5}}>
                    <XAxis interval="preserveStartEnd" dataKey="name" tickFormatter={this.formatXTiks}/>
                    <Tooltip content={<ChartTooltip xAxisLabel={dimension[dim.dim2].name} xAxisUnit={dimension[dim.dim2].unit} uOm={uOm}/>}/>
                    <YAxis label={<CustomizedYLable lab={uOm}/>} interval="preserveStart" tickFormatter={this.formatYTiks}/>
                    <CartesianGrid horizontal={false} strokeDasharray="3 3"/>
                    <Line type="monotone" dataKey="value" stroke="#ff8f31" strokeWidth={2}/>
                    <ReferenceLine x={chartData[dim.dim2Idx].name} stroke={'#2c689c'} strokeWidth={4}/>
                </LineChart>
            </ResponsiveContainer>
        );
    },
    renderChartSlider(chartData) {
        const {dim, dimension, uOm} = this.props;
        const startIndex = this.props.sliders[this.props.uid] ? this.props.sliders[this.props.uid].startIndex : 0;
        let endIndex = this.props.sliders[this.props.uid] ? this.props.sliders[this.props.uid].endIndex : this.props.maxLength - 1;
        endIndex = startIndex === endIndex ? startIndex + 1 : endIndex;
        return (
            <div>
                <div style={{position: 'relative', zIndex: 21}}>
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={chartData} onClick={this.handleClick} margin={{top: 50, right: 30, left: 30, bottom: 5}}>
                            <XAxis interval="preserveStartEnd" dataKey="name" tickFormatter={this.formatXTiks}/>
                            <Tooltip content={<ChartTooltip xAxisLabel={dimension[dim.dim2].name} xAxisUnit={dimension[dim.dim2].unit} uOm={uOm}/>}/>
                            <YAxis label={<CustomizedYLable lab={uOm}/>} interval="preserveStart" tickFormatter={this.formatYTiks}/>
                            <CartesianGrid horizontal={false} strokeDasharray="3 3"/>
                            <Line type="monotone" dataKey="value" stroke="#ff8f31" strokeWidth={2} isAnimationActive={false}/>
                            <ReferenceLine x={chartData[dim.dim2Idx].name} stroke={'#2c689c'} strokeWidth={4}/>
                            <Brush startIndex={startIndex} endIndex={endIndex} dataKey="name" height={30} stroke={'#333'} fill={'rgba(255,255,255,0.6)'}
                                onChange={(index) => {
                                    this.props.chartSliderUpdate(index, this.props.uid);
                                }}/>
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div style={{position: 'relative', top: -35, zIndex: 20}}>
                    <ResponsiveContainer width="100%" height={30}>
                        <LineChart data={chartData} margin={{top: 0, right: 30, left: 30, bottom: 0}}>
                            <XAxis dataKey="name" hide={true}/>
                            <YAxis interval="preserveStart"/>
                            <Line dot={false} type="monotone" dataKey="value" stroke="#ff8f31" strokeWidth={2} isAnimationActive={false}/>
                            <ReferenceLine x={chartData[dim.dim2Idx].name} stroke={'#2c689c'} strokeWidth={4}/>
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    },
    render() {
        const {maxLength} = this.props;
        const chartData = this.getChartData();
        const chart = chartData.length > maxLength ? this.renderChartSlider(chartData) : this.renderChart(chartData);
        return (
            <div>
                <Panel className="chart-panel">
                    {chart}
                </Panel>
                <ExtendedSlider uid={this.props.labelUid} dimIdx={'dim1Idx'}/>
            </div>
        );
    },
    formatYTiks(v) {
        return v.toLocaleString();
    },
    handleClick(data) {
        if (data && this.props.dimension) {
            this.props.setDimIdx('dim2Idx', this.props.dimension[this.props.dim.dim2].values.indexOf(data.activeLabel));
        }
    },
    formatXTiks(v) {
        return !isNaN(v) && parseFloat(v).toLocaleString() || v;
    }
});

module.exports = SliderChart;
