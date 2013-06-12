var jsdom = require('jsdom')

global.window = jsdom.jsdom().createWindow('<html><head></head><body></body></html>')

global.window.jQuery = global.jQuery = global.$ = require('jquery').create(window)
global.document = window.document

global.addEventListener = window.addEventListener

$('html,body').css({ display: 'block', overflow: 'scroll' })