const { join } = require('path');
const { readFileSync } = require('fs');
const { parseDOM } = require('htmlparser2');
const serialize = require('dom-serializer');
const { selectOne } = require('css-select');

const parseOptions = require('./parse-options');
const encodeAndWrapWithEnvelope = require('./encoders');

const defaultOptions = {
    base64: false,
    encode: false,
};

class LessPluginInlineSvg {
    constructor(options = {}) {
        this.options = Object.assign({}, defaultOptions, options);
    }

    setOptions(options) {
        this.options = Object.assign({}, defaultOptions, parseOptions(options));
    }

    install(less) {
        const { Quoted } = less.tree;
        const {
            base64: encodeWithBase64,
            encode: encodeEntities
        } = this.options;

        less.functions.functionRegistry.addMultiple({
            'inline-svg'(fileArg, iconIdsArg, svgArgs) {
                const { value } = fileArg;
                const { currentDirectory } = this.currentFileInfo;

                const filePath = join(currentDirectory, value);
                let svgCode = readFileSync(filePath);

                if (iconIdsArg && svgArgs) {
                    const { value: iconIds } = iconIdsArg;
                    const { value: svgAttrs } = svgArgs;

                    const dom = parseDOM(svgCode, { xmlMode: true });

                    const attributes = svgAttrs.split(/[,;]/)
                        .map(attribute => {
                            const [key, val] = attribute.trim().split(/:\s?/);

                            return {
                                key: key.trim(),
                                val: val.trim()
                            };
                        });

                    for (const iconId of iconIds.split(' ')) {
                        const svgEl = selectOne(`#${iconId}`, dom);

                        attributes.forEach(({ key, val }) => {
                            svgEl.attribs[key] = val;
                        });
                    }

                    svgCode = serialize(dom);
                }

                const encoder = (encodeWithBase64 && 'base64')
                    || (encodeEntities && 'encode')
                    || null;
                const convertedCode = encodeAndWrapWithEnvelope(svgCode, encoder);

                return new Quoted('"', convertedCode);
            }
        })
    }
}

module.exports = LessPluginInlineSvg;
