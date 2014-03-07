require('./test-env')

var Slider = require('..')
  , assert = require('assert')
  , EventEmitter = require('events').EventEmitter
  , slider

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

  afterEach(function () {
    if (slider) {
      slider.unInit()
    }
  })

  describe('Slider()', function () {

    it('should be a function', function () {
      assert.equal(typeof Slider, 'function')
    })

    it('should inherit from event emitter', function () {
      slider = new Slider($('.js-slider-widget'), $('.js-items'), $('.js-items').children(), true)
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
      slider = new Slider($('.js-slider-widget'), $('.js-items'), $('.js-items').children(), true)
      slider.on('change', function (i) {
        assert.equal(i, 0)
        done()
      })
      slider.init()
    })

    it('should make the container the combined width of the items', function () {
      slider = new Slider($('.js-slider-widget'), $('.js-items'), $('.js-items').children(), true)
      slider.init()
      assert.equal(slider.container.width(), 600)
    })

  })

  describe('goTo()', function () {

    it.skip('should show the ith page and hide the others', function (done) {
      slider = new Slider($('.js-slider-widget'), $('.js-items'), $('.js-items').children(), true)
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
      slider = new Slider($('.js-slider-widget'), $('.js-items'), $('.js-items').children(), true)
      slider.init()
      slider.on('change', function () {
        assert(false)
      })
      slider.goTo(10, true)
      slider.goTo(-21, true)
      slider.goTo(3, true)
    })

    it('should allow swiping by default', function (done) {
      slider = new Slider($('.js-slider-widget'), $('.js-items'), $('.js-items').children(), true)

      slider.isTouch = true
      slider.init()

      slider.on('swipeStart', function() {
        done()
      })
      $('.js-items').trigger(createTouchEvent('touchstart', 0, 0))
      $('.js-items').trigger(createTouchEvent('touchmove', -10, 0))
    })

    it('should not swipe if movement is more vertical than horizontal', function () {
      slider = new Slider($('.js-slider-widget'), $('.js-items'), $('.js-items').children(), true)

      slider.isTouch = true
      slider.init()

      slider.on('swipeStart', function() {
        assert(false)
      })
      $('.js-items').trigger(createTouchEvent('touchstart', 0, 0))
      $('.js-items').trigger(createTouchEvent('touchmove', -30, 40))
    })

    it('should not start swiping when disableSwiping is set to true', function () {
      slider = new Slider(
          $('.js-slider-widget')
          , $('.js-items')
          , $('.js-items').children()
          , { nofx: true, disableSwiping: true }
        )

      slider.isTouch = true
      slider.init()

      slider.on('swipeStart', function() {
        assert(false)
      })
      $('.js-items').trigger(createTouchEvent('touchstart', 0, 0))
      $('.js-items').trigger(createTouchEvent('touchmove', -50, 0))
    })

    it.skip('fast finger movement should trigger transition even when it’s short', function (done) {
      var i = 0

      slider = new Slider(
          $('.js-slider-widget')
        , $('.js-items')
        , $('.js-items').children()
        , { nofx: true
          , sensitivity: 2
          , timeProvider: function () {
            return i++ * 50 // increment by 50 milliseconds
          }
        }
      )

      slider.isTouch = true
      slider.init()

      slider.on('change', function(current) {
        assert.equal(current, 2)
        done()
      })
      $('.js-items').trigger(createTouchEvent('touchstart', 0, 0))
      // 50 pixels in 50 milliseconds gives sensitivity of 1
      $('.js-items').trigger(createTouchEvent('touchmove', -50, 0))
      $('.js-items').trigger(createTouchEvent('touchend', -50, 0))
    })

  })

})