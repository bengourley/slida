require('./test-env')

var Slider = require('..')
  , assert = require('assert')
  , EventEmitter = require('events').EventEmitter

window.Modernizr = { touch: false }

function createTouchEvent(type, x, y) {
  return $.Event({
      touches: 1
    , targetTouches: [ {clientX: x, clientY: y} ]
    , type: type
    });
}
describe('slida', function () {

  beforeEach(function () {
    $('body').html(
      [ '<div class="js-slider-widget" style="width:200px">'
      , '  <div class="js-items">'
      , '    <div style="height:100px">'
      , '      <h1>Page 1</h1>'
      , '      <p>This is page one!</p>'
      , '    </div>'
      , '    <div style="height:120px">'
      , '      <h1>Page 2</h1>'
      , '      <p>This is page two!</p>'
      , '    </div>'
      , '    <div style="height:100px">'
      , '      <h1>Page 3</h1>'
      , '      <p>This is page three!</p>'
      , '    </div>'
      , '  </div>'
      , '</div>'
      ].join('\n'))
  })

  describe('Slider()', function () {

    it('should be a function', function () {
      assert.equal(typeof Slider, 'function')
    })

    it('should inherit from event emitter', function () {
      var slider = new Slider($('.js-slider-widget'), $('.js-items'), $('.js-items').children(), true)
      assert(slider instanceof Slider)
      assert(slider instanceof EventEmitter)
      assert.equal(typeof slider.on, 'function')
      assert.equal(typeof slider.emit, 'function')
      assert.equal(typeof slider.removeListener, 'function')
      assert.equal(typeof slider.once, 'function')
    })

  })

  describe('init()', function () {

    it('should emit a change event', function (done) {
      var slider = new Slider($('.js-slider-widget'), $('.js-items'), $('.js-items').children(), true)
      slider.on('change', function (i) {
        assert.equal(i, 0)
        done()
      })
      slider.init()
    })

    it('should make the container the combined width of the items', function () {
      var slider = new Slider($('.js-slider-widget'), $('.js-items'), $('.js-items').children(), true)
      slider.init()
      assert.equal(slider.container.width(), 600)
    })

  })

  describe('goTo()', function () {

    it.skip('should show the ith page and hide the others', function (done) {
      var slider = new Slider($('.js-slider-widget'), $('.js-items'), $('.js-items').children(), true)
      slider.init()
      slider.on('change', function (i) {
        setTimeout(function () {
          assert.equal(i, 2)
          assert.equal(slider.container.css('left'), '400px')
          done()
        }, 0)
      })
      slider.goTo(2, true)
    })

    it('should do no work on invalid input', function () {
      var slider = new Slider($('.js-slider-widget'), $('.js-items'), $('.js-items').children(), true)
      slider.init()
      slider.on('change', function () {
        assert(false)
      })
      slider.goTo(10, true)
      slider.goTo(-21, true)
      slider.goTo(3, true)
    })

    it('should not ignore move events by default', function (done) {
      var slider = new Slider($('.js-slider-widget'), $('.js-items'), $('.js-items').children(), true)
        , touchGesture = createTouchEvent('touchstart', 1, 1)
        , moveGesture = createTouchEvent('touchmove', 5, 1)

      slider.isTouch = true
      slider.init()

      slider.on('swipeStart', function() {
        done()
      })
      $('.js-items').trigger(touchGesture)
      $('.js-items').trigger(moveGesture)
    })

    it('should ignore move events when disableSliding is set to true', function () {
      var touchGesture = createTouchEvent('touchstart', 1, 1)
        , moveGesture = createTouchEvent('touchmove', 5, 1)
        , slider = new Slider(
          $('.js-slider-widget')
          , $('.js-items')
          , $('.js-items').children()
          , { nofx: true, disableSliding: true }
        )

      slider.isTouch = true
      slider.init()

      slider.on('swipeStart', function() {
        assert(false)
      })
      $('.js-items').trigger(touchGesture)
      $('.js-items').trigger(moveGesture)
    })

  })

})