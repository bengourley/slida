module.exports = Slider

var Emitter = require('events').EventEmitter
  , _ = require('lodash')
  , inherits = require('inherits')
  , transitionFn = $.fn.transition ? 'transition' : 'animate'
  , defaults =
    { transitionSpeed: 150
    , disableSwiping: false
    , sensitivity: 2
    , timeProvider: function () {
      return Date.now()
    }}

/*
 * Make a slider out of
 * the given element. Requires
 * a certain html structure.
 */
function Slider(el, container, sections, options) {
  Emitter.call(this)
  this.el = el
  this.container = container
  this.sections = sections
  this.current = null
  this.options = _.extend({ }, defaults)

  if (typeof options === 'object') {
    this.options = _.extend(this.options, options)
  } else {
    this.options.transitionSpeed = options ? 0 : 150
  }

  this.isTouch = window.Modernizr.touch
}

// Be an event emitter
inherits(Slider, Emitter)

Slider.prototype.init = function (current) {
  if (!current) current = 0
  this.el
    .height(this.el.height())
    .css({ position: 'relative', overflow: 'hidden' })
  this.resetWidths()
  this.sections.css({ float: 'left', display: 'block' })
  this.container.css({ position: 'absolute' })
  this.goTo(current)
  if (this.isTouch && !this.options.disableSwiping) {
    this.touchHandlers = this._enableScrollGestures()
  }
  return this
}

Slider.prototype.fitCurrent = function (nofx) {
  if (this.options.transitionSpeed > 0 && nofx) {
    this.el.height(this.sections.eq(this.current).outerHeight(true))
  } else {
    this.el[transitionFn](
      { height: this.sections.eq(this.current).outerHeight(true)
      }, this.options.transitionSpeed)
  }
  return this
}

Slider.prototype.resetWidths = function () {
  var elWidth = this.el.width()
    , sectionPaddingLeft = parseInt(this.sections.css('paddingLeft'), 10)
    , sectionPaddingRight = parseInt(this.sections.css('paddingRight'), 10)

  if (sectionPaddingLeft) elWidth = elWidth + sectionPaddingLeft
  if (sectionPaddingRight) elWidth = elWidth + sectionPaddingRight

  this.sections.width(elWidth)

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
Slider.prototype.goTo = function (index, nofx) {

  if (index < 0 || index >= this.sections.length) return
  this.emit('change', index)

  if (this.options.transitionSpeed > 0 && !nofx) {

    this.container.stop()[transitionFn]({
      left: -(this.sections.eq(index).position().left)
    }, this.options.transitionSpeed * Math.abs(this.current - index), _.bind(function () {
      this.fitCurrent()
    }, this))

  } else {
    this.container.stop().css({ left: -(this.sections.eq(index).position().left) })
    this.fitCurrent()
  }

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
    , allowMove = false
    , mostRecentTouches

  /*
   * Bound to the touchstart event.
   * Binds a touchmove listener on the document.
   */
  var startScroll = _.bind(function (e) {
    // Don't react to multi-touch
    if (this.isTouch && e.originalEvent.touches.length > 1) return

    $(this.container).on('touchmove', handleTouchmove)
    $(this.container).on('touchend touchcancel', handleTouchend)

    inputOrigin = this._getCoords(e)
    startPosition = this.container.position()

    clearMostRecentTouches()
    updateMostRecentTouches(inputOrigin)
  }, this)

  /*
   * Bound to touchmove.
   * Detects if the gesture is
   * of the desired type, and handles
   * accordingly.
   */
  var handleTouchmove = _.bind(function (e) {
    var inputNow = this._getCoords(e)
      , xDelta = Math.abs(inputNow.x - inputOrigin.x)
      , yDelta = Math.abs(inputNow.y - inputOrigin.y)

    updateMostRecentTouches(inputNow)

    if (allowMove) {
      updateScroll(e)
    } else if (xDelta + yDelta === 0) {
      // no move since original event
    } else if (xDelta > yDelta) {
      // A horizontal movement, so start sliding

      this.emit('swipeStart')
      allowMove = true
      updateScroll(e)
    } else {
      // A vertical movement, so let the device scroll the document
      $(this.container).off('touchmove', handleTouchmove)
      $(this.container).off('touchend touchcancel', handleTouchend)
      return true
    }

    return false

  }, this)

  var updateMostRecentTouches = _.bind(function (currentTouch) {
    var now = this.options.timeProvider()
    mostRecentTouches.push({ touch: currentTouch, time: now })

    // if we have at least five recent touches to analyze,
    // ignore anything older than 200 milliseconds
    while (mostRecentTouches.length >= 5
      && now - mostRecentTouches[0].time > 200) {
      mostRecentTouches.shift()
    }
  }, this)

  var clearMostRecentTouches = _.bind(function () {
    mostRecentTouches = []
  }, this)

  /*
   * Bound to touchmove.
   * Updates the position of the scrollable
   * element based on the user input.
   */
  var updateScroll = _.bind(function (e) {

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
  var handleTouchend = _.bind(function () {

    var endPoint = this.container.position().left
      , velocity = calculateVelocity()
      , closest

    allowMove = false

    $(this.container).off('touchmove', handleTouchmove)
    $(this.container).off('touchend', handleTouchend)

    if (endPoint > 0) {
      this.container[transitionFn]({ left: max }, 300, _.bind(function () {
        this.fitCurrent()
      }, this))
      this.emit('change', 0)
      this.current = 0
    } else if (endPoint < min) {
      this.container[transitionFn]({ left: min }, 300, _.bind(function () {
        this.fitCurrent()
      }, this))
      this.emit('change', this.sections.length - 1)
      this.current = this.sections.length - 1
    } else {
      closest = this._snap(endPoint)

      var snapPoints = this._getSnapPoints()
        , current = _.indexOf(snapPoints, closest)

      // see if finger movement was fast enough to trigger transition
      if (current === this.current && (1 / Math.abs(velocity)) < this.options.sensitivity) {
        if (current < snapPoints.length - 1 && velocity > 0) {
          closest = snapPoints[current + 1]
        } else if (current > 0 && velocity < 0) {
          closest = snapPoints[current - 1]
        }
      }
      this.container[transitionFn]({ left: -closest }, 200, _.bind(function () {
        this.fitCurrent()
      }, this))

      current = _.indexOf(snapPoints, closest)
      this.emit('change', current)
      this.current = current

    }

    return false
  }, this)

  var calculateVelocity = _.bind(function () {
    if (!mostRecentTouches.length > 0) {
      return 0
    }
    var first
      , last
      , distance
      , time

    first = mostRecentTouches.shift()
    last = mostRecentTouches.pop()

    distance = -(last.touch.x - first.touch.x)
    time = last.time - first.time

    return distance / time
  }, this)

  this.container.on('touchstart', startScroll)

  return { touchstart: startScroll
         , touchmove: handleTouchmove
         , touchend: handleTouchend }
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

  if (this.touchHandlers) {
    this.container.off('touchstart', this.touchHandlers.touchstart)
    this.container.off('touchmove', this.touchHandlers.touchmove)
    this.container.off('touchend touchcancel', this.touchHandlers.touchend)
  }
}