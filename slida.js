module.exports = Slider

var Emitter = require('events').EventEmitter
  , _ = require('lodash')
  , transitionFn = $.fn.transition ? 'transition' : 'animate'

/*
 * Make a slider out of
 * the given element. Requires
 * a certain html structure.
 */
function Slider(el, container, sections, nofx) {
  Emitter.call(this)
  this.el = el
  this.container = container
  this.sections = sections
  this.current = null
  this.transitionSpeed = 150
  this.isTouch = window.Modernizr.touch
}

// Be an event emitter
Slider.prototype = Emitter.prototype

Slider.prototype.init = function () {
  this.el
    .height(this.el.height())
    .css({ position: 'relative', overflow: 'hidden' })
  this.resetWidths()
  this.sections.css({ float: 'left', display: 'block'})
  this.container.css({ position: 'absolute'})
  this.goTo(0)
  if (this.isTouch) this._enableScrollGestures()
  return this
}

Slider.prototype.fitCurrent = function (nofx) {
  if (nofx) {
    this.el.height(this.sections.eq(this.current).outerHeight(true))
  } else {
    this.el.transition(
      { height: this.sections.eq(this.current).outerHeight(true)
      }, 150)
  }
  return this
}

Slider.prototype.resetWidths = function () {
  this.sections.css(
    { width: this.el.width() -
             parseInt(this.sections.css('paddingLeft'), 10) -
             parseInt(this.sections.css('paddingRight'), 10)
    })
  this.container.css(
    { width: (function () {
        var w = 0
        this.sections.each(function () {
          w += $(this).outerWidth(true)
        })
        return w
      }.apply(this))
    })
  return this
}

/*
 * Go to slide number `index`
 */
Slider.prototype.goTo = function (index) {
  if (index < 0 || index >= this.sections.length) return
  this.emit('change', index)
  this.container.stop().transition({
    left: -(this.sections.eq(index).position().left)
  }, this.transitionSpeed * Math.abs(this.current - index), _.bind(function () {
    this.fitCurrent()
  }, this))
  this.current = index
  return this
}

/*
 * Get the input coordinates of
 * a touch/mouse event `e`
 */
Slider.prototype._getCoords = function (e) {
  return this.isTouch
    ? { x: e.originalEvent.targetTouches[0].clientX
      , y: e.originalEvent.targetTouches[0].clientY
      }
    : { x: e.clientX
      , y: e.clientY
      }
}

/*
 * Set up touch event handlers
 */
Slider.prototype._enableScrollGestures = function () {

  // Cache the offset
  var startPosition
    , inputOrigin
    , max = 0
    , min = -(this.container.width() - this.el.width())

  /*
   * Bound to the touchstart event.
   * Binds a touchmove listener on the document.
   */
  var startScroll = _.bind(function (e) {

    // Don't react to multi-touch
    if (this.isTouch && e.originalEvent.touches.length > 1) return

    $(document).on('touchmove', detectGesture)

    inputOrigin = this._getCoords(e)
    startPosition = this.container.position()

  }, this)

  /*
   * Bound to touchmove.
   * Detects if the gesture is
   * of the desired type, and handles
   * accordingly.
   */
  var detectGesture = _.bind(function (e) {

    var inputNow = this._getCoords(e)

    if (Math.abs(inputNow.x - inputOrigin.x) === 0 &&
        Math.abs(inputOrigin.y - inputOrigin.y) === 0) {
      // No move since original event
      return
    } else if (Math.abs(inputNow.x - inputOrigin.x) >
               Math.abs(inputNow.y - inputOrigin.y)) {
      this.emit('swipeStart')
      // A horizontal movement, so add the touchmove handler
      $(document).on('touchmove', updateScroll)
      $(document).on('touchend', endScroll)
      $(document).off('touchmove', detectGesture)
    } else {
      // A vertical movement, so let the
      // device scroll the document
      $(document).off('touchmove', detectGesture)
    }

  }, this)

  /*
   * Bound to touchmove.
   * Updates the position of the scrollable
   * element based on the user input.
   */
  var updateScroll = _.bind(function (e) {

    e.preventDefault()

    var pos = this._getCoords(e)
      , newpos = startPosition.left + pos.x - inputOrigin.x

    // Elastic bounds
    if (newpos > max) {
      newpos = 4 * Math.sqrt(newpos)
    } else if (newpos < min) {
      newpos = min - (4 * Math.sqrt(min - newpos))
    }

    this.container.css({ left: newpos })

  }, this)

  /*
   * Bound to touchend.
   * Detaches event handlers and snap to the
   * nearest snapPoint or edge.
   */
  var endScroll = _.bind(function (e) {

    var endPoint = this.container.position().left
      , closest

    $(document).off('touchmove', updateScroll)
    $(document).off('touchend', endScroll)

    if (endPoint > 0) {
      this.container.transition({ left: max }, 300, _.bind(function () {
        this.fitCurrent()
      }, this))
      this.emit('change', 0)
      this.current = 0
    } else if (endPoint < min) {
      this.container.transition({ left: min }, 300, _.bind(function () {
        this.fitCurrent()
      }, this))
      this.emit('change', this.sections.length - 1)
      this.current = this.sections.length - 1
    } else {
      closest = this._snap(endPoint)
      this.container.transition({ left: -closest }, 200, _.bind(function () {
        this.fitCurrent()
      }, this))
      var current = _.indexOf(this._getSnapPoints(), closest)
      this.emit('change', current)
      this.current = current
    }

  }, this)

  this.container.on('touchstart', startScroll)
  return this
}

/*
 * Get an array of values along the horizontal
 * axis where the left hand edge of some content
 * within the element will line up with the left hand
 * edge of the element.
 */
Slider.prototype._getSnapPoints = function () {
  var snapPoints = []
  this.sections.each(function () {
    snapPoints.push($(this).position().left)
  })
  return snapPoints
}

/*
 * Snap a given value to the closest snap point.
 */
Slider.prototype._snap = function (value) {
  var closest = Infinity
  $.each(this._getSnapPoints(), function () {
    if (Math.abs(-value - this) < Math.abs(-value - closest)) {
      closest = this
    }
  })
  return +closest
}

/*
 * Uninitialise the slider
 */
Slider.prototype.unInit = function () {
  this.el
    .height('')
    .css({ position: '', overflow: '' })
  this.sections.css({ float: '', display: '', width: '' })
  this.container.css({ position: '', width: '' })
  // Todo: refactor so that only function that was bound is removed
  // (rather than blindly removing ALL touchstart handlers)
  this.container.off('touchstart')
}