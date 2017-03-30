/**
 * Copyright 2017, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

const React = require('react');
const {Tooltip, OverlayTrigger} = require('react-bootstrap');

const DownloadBtn = React.createClass({
    propTypes: {
        downloadAction: React.PropTypes.func,
        downloading: React.PropTypes.bool,
        label: React.PropTypes.string
    },
    getDefaultProps() {
        return {
            downloading: false,
            label: "Download Pdf"
        };
    },
    render() {
        const {label, downloading, downloadAction} = this.props;
        const tooltip = (<Tooltip id={"tooltip-sub-value"} className="disaster">{label}</Tooltip>);
        return (
          <OverlayTrigger placement="bottom" overlay={tooltip}>
            <button disabled={!downloadAction} className="btn btn-primary" onClick={downloadAction}>
                  {downloading ? (<i className="icon-spinner fa-spin"/>) : (<i className="fa fa-file-pdf-o"/>)}
            </button>
          </OverlayTrigger>);
    }
});

module.exports = DownloadBtn;