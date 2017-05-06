class Slider extends Base.Component {
  constructor () {
    super(...arguments)
    this.state = {
      currentSlide: this.props.currentSlide
    }
  }

  sliderListRef = (ref) => {
    this.sliderList = ref
  }

  sliderItemsRef = (ref) => {
    this.sliderItems = this.sliderItems || []
    if (this.sliderItems.indexOf(ref) < 0 && ref !== null) {
      this.sliderItems.push(ref)
    }
  }
  
  componentWillReceiveProps () {
    this.sliderItems = []
    this.pause()
    this.initSlider()
  }

  componentDidMount () {
    this.initSlider()
  }

  initSlider () {
    let slideWidth = getWidth(this.dom)
    let slideCount = this.props.children.length
    let wrapperStyle = {}
    wrapperStyle.width = (slideCount + 2 * this.props.slidesToShow) * slideWidth
    this.setState({
      mounted: true,
      slideWidth,
      slideCount,
      wrapperStyle,
      pause: false
    }, () => {
      this.autoPlay()
    })
  }

  autoPlay () {
    this.autoPlayTimer && clearTimeout(this.autoPlayTimer)
    if (this.props.autoPlay && !this.state.pause) {
      this.autoPlayTimer = setTimeout(this.play.bind(this), this.props.autoPlayInterval)
    }
  }

  play () {
    let nextIndex
    if (!this.state.mounted) {
      return false
    }
    if (!this.canGoNext()) {
      return false
    }
    nextIndex = this.state.currentSlide + this.props.slidesToScroll
    this.slideTo(nextIndex)
  }

  pause () {
    this.autoPlayTimer && clearTimeout(this.autoPlayTimer)
    this.setState({
      pause: true
    })
  }

  slideTo (index) {
    let currentSlide
    let targetSlide
    const { fade, infinite, afterChange, beforeChange, speed } = this.props
    const { slideCount } = this.state
    if (this.animating) {
      return
    }
    if (fade) {
      currentSlide = this.state.currentSlide
      if (infinite === false &&
        (index < 0 || index >= slideCount)) {
        return
      }
      if (index < 0) {
        targetSlide = index + slideCount
      } else if (index >= slideCount) {
        targetSlide = index - slideCount
      } else {
        targetSlide = index
      }
      if (this.props.lazyLoad && this.state.lazyLoadedList.indexOf(targetSlide) < 0) {
        this.setState({
          lazyLoadedList: this.state.lazyLoadedList.concat(targetSlide)
        })
      }
      if (beforeChange) {
        beforeChange.call(this, currentSlide, targetSlide)
      }
      this.animating = true
      this.sliderItems.forEach((itemNode, i) => {
        if (i === targetSlide) {
          itemNode.style.zIndex = 1
          fadeIn(itemNode, speed, 'ease-in-out')
        } else if (i === currentSlide) {
          fadeOut(itemNode, speed)
          itemNode.style.zIndex = 0
        }
      })
      this.setState({
        currentSlide: targetSlide
      }, function () {
        setTimeout(() => {
          this.animating = false
          if (afterChange) {
            afterChange.call(targetSlide)
          }
        }, speed)
      })
      this.autoPlay()
    }
  }

  changeSlide (type, opts) {
    let indexOffset, previousInt, slideOffset, unevenOffset, targetSlide
    const { slidesToScroll, slidesToShow } = this.props
    const { slideCount, currentSlide } = this.state
    unevenOffset = (slideCount % slidesToScroll !== 0)
    indexOffset = unevenOffset ? 0 : (slideCount - currentSlide) % slidesToScroll
    if (type === 'previous') {
      slideOffset = (indexOffset === 0) ? slidesToScroll : slidesToShow - indexOffset;
      targetSlide = currentSlide - slideOffset
    } else if (type === 'next') {
      slideOffset = (indexOffset === 0) ? slidesToScroll : indexOffset;
      targetSlide = currentSlide + slideOffset
    } else if (type === 'indicate') {
      targetSlide = opts.index * slidesToScroll
    }
    this.slideTo(targetSlide)
  }

  slideToPrev () {
    this.changeSlide('previous')
  }

  slideToNext () {
    this.changeSlide('next')
  }

  slideToTarget (index) {
    this.changeSlide('indicate', {
      index
    })
  }

  onSliderOver (e) {
    if (this.props.pauseOnHover) {
      this.pause()
    }
  }

  onSliderOut (e) {
    if (this.props.pauseOnHover) {
      this.setState({
        pause: false
      }, function () {
        this.autoPlay()
      })
    }
  }

  canGoNext () {
    if (!this.props.infinite) {
      let slideCount = this.state.slideCount
      let slidesToShow = this.props.slidesToShow
      let currentSlide = this.state.currentSlide
      if (slideCount <= slidesToShow
        || currentSlide >= (slideCount - slidesToShow)) {
        return false
      }
    }
    return true
  }

  renderSlides () {
    const props = this.props
    let children = props.children
    let slides = []
    let preCloneSlides = []
    let lastCloneSlides = []
    let key
    let count = children.length
    const { fade, infinite, speed, lazyload, lazyloadList, slidesToShow } = props
    children.forEach((child, index) => {
      if (lazyload && lazyloadList.indexOf(index) < 0) {
        child = <div />
      }
      let style = this.getSlideStyle(index)
      let classnames = this.getSlideClassNames(index)
      if (child.properties.className) {
        classnames = classnames.concat(child.properties.className.split(' '))
      }
      style = Base.Util.extend(child.properties.style || {}, style)
      slides.push(Base.cloneElement(child, {
        key: `slider_original${child.key ? child.key : index}`,
        'data-index': index,
        className: classnames.join(' '),
        style,
        ref: this.sliderItemsRef
      }, child.children))
      if (infinite && !fade) {
        if (index >= (count - slidesToShow)) {
          key = -(count - index)
          preCloneSlides.push(Base.cloneElement(child, {
            key: `slider_pre_clone${child.key ? child.key : key}`,
            'data-index': key,
            className: classnames.join(' '),
            style,
            ref: this.sliderItemsRef
          }, child.children))
        }
        if (index < slidesToShow) {
          key = count + index
          lastCloneSlides.push(Base.cloneElement(child, {
            key: `slider_last_clone${child.key ? child.key : key}`,
            'data-index': key,
            className: classnames.join(' '),
            style,
            ref: this.sliderItemsRef
          }, child.children))
        }
      }
    })
    return preCloneSlides.concat(slides).concat(lastCloneSlides)
  }

  getSlideClassNames (index) {
    const props = this.props
    let classnames = []
    classnames.push('slider_item')
    return classnames
  }

  getSlideStyle (index) {
    const props = this.props
    const state = this.state
    let style = {}
    style.width = state.slideWidth
    style.float = 'left'
    const isCurrent = this.state.currentSlide === index
    if (props.fade) {
      style.position = 'relative'
      style.left = -index * state.slideWidth
      style.opacity = isCurrent ? 1 : 0
      style.filter = `alpha(opacity=${isCurrent ? 100 : 0})`
      style.zIndex = isCurrent ? 1 : 0
    }
    return style
  }

  render () {
    const props = this.props
    let prevArrow, nextArrow, indicators
     const prevArrowProps = {
      clickHandler: this.slideToPrev.bind(this),
      arrow: props.prevArrow,
      className: addClassName('slider_control slider_control_prev', props.prevArrowClassName),
      text: props.prevArrowText || '<'
    }
    const nextArrowProps = {
      clickHandler: this.slideToNext.bind(this),
      arrow: props.nextArrow,
      className: addClassName('slider_control slider_control_next', props.nextArrowClassName),
      text: props.nextArrowText || '>'
    }
    if (props.arrows) {
      prevArrow = <Arrow {...prevArrowProps} />
      nextArrow = <Arrow {...nextArrowProps} />
    }
    const indicatorsProps = {
      count: this.state.slideCount,
      currentIndex: this.state.currentSlide,
      itemHandler: this.slideToTarget.bind(this),
      indicatorHoverToSlide: props.indicatorHoverToSlide
    }
    if (props.indicators) {
      indicators = <Indicators {...indicatorsProps} />
    }
    let className = addClassName('slider', props.className)
    const slides = this.renderSlides()
    return (
      <div className={className}>
        {slides.length > 1 && prevArrow}
        {slides.length > 0 && <div className="slider_list"
          ref={this.sliderListRef}
          onMouseOver={this.onSliderOver.bind(this)}
          onMouseOut={this.onSliderOut.bind(this)}>
          <div className='slider_wrapper' style={this.state.wrapperStyle}>
            {slides}
          </div>
        </div>}
        {slides.length > 1 && nextArrow}
        {slides.length > 1 && indicators}
      </div>
    )
  }
}

Slider.defaultProps = {
  slidesToShow: 1,
  slidesToScroll: 1,
  autoPlay: true,
  autoPlayInterval: 3000,
  fade: true,
  infinite: true,
  speed: 300,
  currentSlide: 0,
  pauseOnHover: true
}

function getWidth (node) {
  if (!node) {
    return 0
  }
  return node.getBoundingClientRect().width || node.offsetWidth
}

function addClassName (origin, newClassName) {
  if (newClassName === null
    || newClassName === undefined
    || newClassName === false) {
    return origin
  }
  origin = origin || ''
  origin = origin.split(' ')
  origin.push(newClassName)
  origin = origin.join(' ')
  return origin
}

function supportTransition () {
  return ('transition' in document.documentElement.style)
    || ('WebkitTransition' in document.documentElement.style)
}

const fadeIn = (function () {
  const isSupportTransition = supportTransition()
  return function (node, speed, easeType, callback) {
    if (!node) {
      return
    }
    if (isSupportTransition) {
      node.style.opacity = 1
      node.style.transition = `opacity ${speed}ms ${easeType}`
      return
    }
    node.style.opacity = 0
    node.style.filter = 'alpha(opacity=0)'
    if (speed) {
      let opacity = 0
      let timer = null
      function done () {
        opacity += 16 / speed
        if (opacity >= 1) {
          timer && clearTimeout(timer)
          opacity = 1
          node.style.opacity = opacity
          node.style.filter = `alpha(opacity=${opacity * 100})`
          callback && callback
        } else {
          node.style.opacity = opacity
          node.style.filter = `alpha(opacity=${opacity * 100})`
          timer && clearTimeout(timer)
          timer = setTimeout(done, 16)
        }
      }
      timer = setTimeout(done, 16)
    } else {
      node.style.opacity = 1
      node.style.filter = 'alpha(opacity=100)'
    }
  }
})()

const fadeOut = (function () {
  const isSupportTransition = supportTransition()
  return function (node, speed, easeType, callback) {
    if (!node) {
      return
    }
    if (isSupportTransition) {
      node.style.opacity = 0
      node.style.transition = `opacity ${speed}ms ${easeType}`
      return
    }
    node.style.opacity = 1
    node.style.filter = 'alpha(opacity=100)'
    if (speed) {
      let opacity = 1
      let timer = null
      function done () {
        opacity -= 16 / speed
        if (opacity <= 0) {
          timer && clearTimeout(timer)
          opacity = 0
          node.style.opacity = opacity
          node.style.filter = `alpha(opacity=${opacity * 100})`
          callback && callback
        } else {
          node.style.opacity = opacity
          node.style.filter = `alpha(opacity=${opacity * 100})`
          timer && clearTimeout(timer)
          timer = setTimeout(done, 16)
        }
      }
      timer = setTimeout(done, 16)
    } else {
      node.style.opacity = 0
      node.style.filter = 'alpha(opacity=0)'
    }
  }
})()

class Arrow extends Base.Component {
  constructor () {
    super(...arguments)
  }

  onClickHandler = (event) => {
    event && event.preventDefault()
    this.props.clickHandler()
  }

  render () {
    const props = this.props
    let className = props.className
    let passedProps = {
      className
    }
    return props.arrow
      ? props.arrow
      : <button {...passedProps} onClick={this.onClickHandler}>{this.props.text}</button>
  }
}

class Indicators extends Base.Component {
  constructor () {
    super(...arguments)
  }

  onItemHandler (index, e) {
    e && e.preventDefault()
    this.props.itemHandler(index)
  }

  renderIndicatorItems () {
    const { count, currentIndex, indicatorHoverToSlide } = this.props
    return (() => {
      let arr = []
      for (let i = 0; i < count; i++) {
        let className = 'slider_indicators_btn'
        if (i === count - 1) {
          className = addClassName(className, 'slider_indicators_btn_last')
        }
        if (i === currentIndex) {
          className = addClassName(className, 'slider_indicators_btn_active')
        }
        if (indicatorHoverToSlide) {
          arr.push(<i className={className} onMouseOver={this.onItemHandler.bind(this, i)}></i>)
        } else {
          arr.push(<i className={className} onClick={this.onItemHandler.bind(this, i)}></i>)
        }
      }
      return arr
    })()
  }

  setStyle () {
    const domNode = this.dom
    const width = getWidth(domNode)
    domNode.style.marginLeft = -(width / 2) + 'px'
  }

  componentDidMount () {
    this.setStyle()
  }

  componentWillUpdate (nextProps) {
    if (nextProps.count !== this.props.count) {
      this.setStyle()
    }
  }

  shouldComponentUpdate (nextProps, nextState) {
    if (nextProps.currentIndex !== this.props.currentIndex
      || nextProps.count !== this.props.count) {
      return true
    }
    return false
  }

  render () {
    const items = this.renderIndicatorItems()
    return (
      <div className='slider_indicators'>
        {items}
      </div>
    )
  }
}