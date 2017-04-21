/**
 * Copyright 2017, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

const React = require('react');
const {LineChart, Tooltip, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer} = require('recharts');
const {Panel} = require('react-bootstrap');
const Nouislider = require('react-nouislider');
const ChartTooltip = require("./ChartTooltip");

const CustomizedYLabel = (props) => {
    const {y, lab, viewBox} = props;
    return (
        <g>
            <text x={viewBox.width / 2} y={y} dy={-25} dx={0} textAnchor="middle" fill="#666" transform="rotate(0)">{lab}</text>
        </g>
    );
};

const CustomizedXLabel = (props) => {
    const {x, y, payload} = props;
    let val = payload.value.split(" ")[0];
    val = val.length > 8 ? val.substring(0, 8) + '...' : val;
    return (
      <g transform={`translate(${x},${y})`}>
          <text x={0} y={0} dx={-4} textAnchor="end" fill="#666" transform="rotate(-90)">{val}</text>
      </g>
    );
};

const AdditionalChart = React.createClass({
    propTypes: {
        table: React.PropTypes.object,
        currentSection: React.PropTypes.number,
        currentCol: React.PropTypes.number,
        setIndex: React.PropTypes.func
    },
    getDefaultProps() {
        return {
            table: {},
            currentSection: 0,
            currentCol: 0,
            setIndex: () => {}
        };
    },
    getChartData(values, scenarios) {
        return values[this.props.currentCol].map((v, idx) => {return {value: parseFloat(v, 10), name: scenarios[idx].label}; });
    },
    getTableData(values, scenarios) {
        return values[this.props.currentCol].map((v, idx) => {return {value: v, name: scenarios[idx].label}; });
    },
    renderSectionSlider(loc, min, max, to, style, onChange) {
        return min === max ? null : (
            <div className="slider-box" style={style}>
            <Nouislider
                range={{min, max}}
                start={[loc]}
                step={1}
                tooltips={false}
                pips= {{
                    mode: 'steps',
                    density: 100,
                    format: {
                        to: to,
                        from: this.formatFrom
                    }
                }}
                onChange={onChange}
                />
            </div>
        );
    },
    renderTable(values, scenarios, cols) {
        const tableData = this.getTableData(values, scenarios);
        return (
            <Panel className="chart-panel">
                <div className="text-center">{cols[this.props.currentCol].label}</div>
                <br/>
                <div className="text-center">{cols[this.props.currentCol].uOfm}</div>
                <div className="container-fluid">
                    <table className="table table-striped">
                        <tbody>
                        {tableData.map((v, idx) => {
                            return (
                                <tr key={idx}>
                                    <td>{v.name}</td>
                                    <td>{v.value}</td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
                {this.renderSectionSlider(this.props.currentCol, 0, cols.length - 1, this.formatToCol, {height: 80, margin: '0 30px'}, (v) => {
                    this.props.setIndex(this.props.currentSection, Number.parseInt(v));
                })}
            </Panel>
        );
    },
    renderChart(values, scenarios, cols) {
        const chartData = this.getChartData(values, scenarios);
        return (
            <Panel className="chart-panel">
                <div className="text-center">{cols[this.props.currentCol].label}</div>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData} onClick={this.handleClick} margin={{top: 50, right: 30, left: 30, bottom: 50}}>
                        <Line type="monotone" dataKey="value" stroke="#ff8f31" strokeWidth={2}/>
                        <CartesianGrid horizontal={false} strokeDasharray="3 3"/>
                        <Tooltip content={<ChartTooltip xAxisLabel={'Scenario'} xAxisUnit={''} uOm={cols[this.props.currentCol].uOfm}/>}/>
                        <XAxis tick={<CustomizedXLabel/>} interval={0} dataKey="name" tickFormatter={this.formatXTiks}/>
                        <YAxis label={<CustomizedYLabel lab={cols[this.props.currentCol].uOfm}/>} interval="preserveStart" tickFormatter={this.formatYTiks}/>
                    </LineChart>
                </ResponsiveContainer>
                {this.renderSectionSlider(this.props.currentCol, 0, cols.length - 1, this.formatToCol, {height: 80, margin: '0 30px'}, (v) => {
                    this.props.setIndex(this.props.currentSection, Number.parseInt(v));
                })}
            </Panel>
        );
    },
    renderCharts() {
        const {sections = [], scenarios} = this.props.table;
        const {title, values, cols} = sections[this.props.currentSection];
        const display = this.checkNaN(values[this.props.currentCol]).length > 0 ? this.renderTable(values, scenarios, cols) : this.renderChart(values, scenarios, cols);
        return (
            <div>
                {display}
                <div className="text-center btn slider-lab disabled">{title}</div>
                <div className="slider-box">
                {this.renderSectionSlider(this.props.currentSection, 0, sections.length - 1, this.formatToSection, {}, (v) => {
                    this.props.setIndex(Number.parseInt(v), 0);
                })}
                </div>
            </div>
        );
    },
    render() {
        return this.props.table && this.props.table.sections && this.props.table.sections.length > 0 ? this.renderCharts() : null;
    },
    formatYTiks(v) {
        return v.toLocaleString();
    },
    formatXTiks(v) {
        return !isNaN(v) && parseFloat(v).toLocaleString() || v;
    },
    formatToCol(value) {
        const {sections = []} = this.props.table;
        const {cols} = sections[this.props.currentSection];
        let val = cols[value].label.split(" ")[0];
        return val.length > 8 ? val.substring(0, 8) + '...' : val;
    },
    formatToSection(value) {
        const {sections = []} = this.props.table;
        let val = sections[value].title.split(" ")[0];
        return val.length > 7 ? val.substring(0, 7) + '...' : val;
    },
    formatFrom(value) {
        return value;
    },
    checkNaN(values) {
        return values.filter((v) => {
            return isNaN(v);
        });
    }
});

module.exports = AdditionalChart;
