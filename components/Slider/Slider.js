const supportTransition = (function () {
  return (('transition' in document.documentElement.style)
    || ('WebkitTransition' in document.documentElement.style))
})()

class Slider extends Base.Component {
  constructor () {
    super(...arguments)
    this.state = {
      currentSlide: this.props.currentSlide,
      lazyLoadedList: []
    }
  }

  sliderListRef = (ref) => {
    this.sliderList = ref
  }

  sliderWrapperRef = (ref) => {
    this.sliderWrapper = ref
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

  componentWillMount () {
    let lazyLoadedList = []
    const props = this.props
    const state = this.state
    const { children, slidesToShow, lazyLoad } = props
    const currentSlide = state.currentSlide
    children.forEach((item, i) => {
      if (i >= currentSlide && i < currentSlide + slidesToShow) {
        lazyLoadedList.push(i)
      }
    })

    if (lazyLoad && state.lazyLoadedList.length === 0) {
      this.setState({
        lazyLoadedList: lazyLoadedList
      })
    }
  }

  componentDidMount () {
    this.initSlider()
  }

  initSlider () {
    const props = this.props
    const { slidesToShow, children, fade } = props
    let slideWidth = getWidth(this.dom) / slidesToShow
    let slideCount = children.length
    this.setState({
      mounted: true,
      slideWidth,
      slideCount,
      pause: false
    }, () => {
      if (fade) {
        this.sliderItems.forEach((itemNode, i) => {
          if (i === this.state.currentSlide) {
            itemNode.style.opacity = 1
            itemNode.style.filter = `alpha(opacity=100)`
            itemNode.style.zIndex = 1
          } else {
            itemNode.style.opacity = 0
            itemNode.style.filter = `alpha(opacity=0)`
            itemNode.style.zIndex = 0
          }
        })
      }
      let wrapperLeftOffset = this.getSliderLeftOffset(this.state.currentSlide)
      let wrapperStyle = this.getSliderWrapperStyle(wrapperLeftOffset)
      this.setState({
        wrapperStyle
      })
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
    const {
      fade,
      infinite,
      afterChange,
      beforeChange,
      speed,
      slidesToScroll,
      slidesToShow,
      lazyLoad,
      easeType
    } = this.props
    const { slideCount, lazyLoadedList } = this.state
    if (this.animating) {
      return
    }
    currentSlide = this.state.currentSlide
    if (fade) {
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
          fadeIn(itemNode, speed, easeType)
        } else if (i === currentSlide) {
          itemNode.style.zIndex = 0
          fadeOut(itemNode, speed)
        }
      })
      this.setState({
        currentSlide: targetSlide
      }, function () {
        this.animationEndCallback = setTimeout(() => {
          this.animating = false
          if (afterChange) {
            afterChange.call(targetSlide)
          }
          delete this.animationEndCallback
        }, speed)
      })
      this.autoPlay()
      return
    }
    let currentSliderLeft = this.getSliderLeftOffset(currentSlide)
    targetSlide = index
    if (targetSlide < 0) {
      if(infinite === false) {
        currentSlide = 0
      } else if (slideCount % slidesToScroll !== 0) {
        currentSlide = slideCount - (slideCount % slidesToScroll)
      } else {
        currentSlide = slideCount + targetSlide
      }
    } else if (targetSlide >= slideCount) {
      if(infinite === false) {
        currentSlide = slideCount - slidesToShow
      } else if (slideCount % slidesToScroll !== 0) {
        currentSlide = 0
      } else {
        currentSlide = targetSlide - slideCount
      }
    } else {
      currentSlide = targetSlide
    }
    let realCurrentSliderLeft = this.getSliderLeftOffset(currentSlide)
    let targetSliderLeft = this.getSliderLeftOffset(targetSlide)
    if (infinite === false) {
      targetSliderLeft = currentSliderLeft
    }
    if (this.props.beforeChange) {
      this.props.beforeChange(this.state.currentSlide, currentSlide);
    }

    if (this.props.lazyLoad) {
      let loaded = true
      let slidesToLoad = []
      for (let i = targetSlide; i < targetSlide + slidesToShow; i++) {
        loaded = loaded && (lazyLoadedList.indexOf(i) >= 0)
        if (!loaded) {
          slidesToLoad.push(i)
        }
      }
      if (!loaded) {
        this.setState({
          lazyLoadedList: lazyLoadedList.concat(slidesToLoad)
        });
      }
    }
    this.animating = true
    slideAnimate(this.sliderWrapper, speed, easeType, currentSliderLeft, targetSliderLeft)
    this.setState({
      currentSlide: currentSlide
    }, function () {
      this.animationEndCallback = setTimeout(() => {
        this.animating = false
        let wrapperStyle = this.getSliderWrapperStyle(realCurrentSliderLeft)
        for (let i in wrapperStyle) {
          this.sliderWrapper.style[i] = wrapperStyle[i]
        }
        if (afterChange) {
          afterChange.call(currentSlide)
        }
        delete this.animationEndCallback
      }, speed)
    })

    this.autoPlay()
  }

  changeSlide (type, opts) {
    let indexOffset, previousInt, slideOffset, unevenOffset, targetSlide
    const { slidesToScroll, slidesToShow } = this.props
    const { slideCount, currentSlide } = this.state
    unevenOffset = (slideCount % slidesToScroll !== 0)
    indexOffset = unevenOffset ? 0 : (slideCount - currentSlide) % slidesToScroll
    if (type === 'previous') {
      slideOffset = (indexOffset === 0) ? slidesToScroll : slidesToShow - indexOffset
      targetSlide = currentSlide - slideOffset
    } else if (type === 'next') {
      slideOffset = (indexOffset === 0) ? slidesToScroll : indexOffset
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
      let slideCount = slideCount
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
    const { fade, infinite, speed, lazyLoad, slidesToShow } = props
    const lazyLoadedList = this.state.lazyLoadedList
    children.forEach((child, index) => {
      if (lazyLoad && lazyLoadedList.indexOf(index) < 0) {
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
    if (props.fade) {
      style.position = 'relative'
      style.left = -index * state.slideWidth
      if (supportTransition) {
        style.transition = `opacity ${props.speed}ms ${props.easeType}`,
        style.WebkitTransition = `opacity ${props.speed}ms ${props.easeType}`
      }
    }
    return style
  }

  getSliderWrapperStyle (leftOffset) {
    const { slideCount, slideWidth } = this.state
    let wrapperStyle = {
      opacity: 1,
      width: (slideCount + 2 * this.props.slidesToShow) * slideWidth
    }
    
    if (supportTransition) {
      wrapperStyle = Base.Util.extend(wrapperStyle, {
        WebkitTransform: `translate3d(${leftOffset}px, 0px, 0px)`,
        transform: `translate3d(${leftOffset}px, 0px, 0px)`,
        transition: 'none',
        WebkitTransition: 'none',
        msTransform: `translateX(${leftOffset}px)`
      })
    } else {
      wrapperStyle = Base.Util.extend(wrapperStyle, {
        marginLeft: leftOffset + 'px'
      })
    }
    return wrapperStyle
  }

  getSliderLeftOffset (currentSlide) {
    const props = this.props
    const state = this.state
    const { fade, infinite, slidesToShow, slidesToScroll } = props
    const { slideCount, slideWidth } = state
    let sliderLeftOffset
    if (fade) {
      return 0
    }
    if (infinite) {
      if (slideCount >= slidesToShow) {
        sliderLeftOffset = (slideWidth * slidesToShow) * -1
      }
      if (slideCount % slidesToScroll !== 0) {
        if (currentSlide + slidesToScroll > slideCount && slideCount > slidesToShow) {
          if(currentSlide > slideCount) {
            sliderLeftOffset = ((slidesToShow - (currentSlide - slideCount)) * slideWidth) * -1;
          } else {
            sliderLeftOffset = ((slideCount % slidesToScroll) * slideWidth) * -1;
          }
        }
      }
    } else {
      if (slideCount % slidesToScroll !== 0) {
        if (currentSlide + slidesToScroll > slideCount && slideCount > slidesToShow) {
          var slidesToOffset = slidesToShow - (slideCount % slidesToScroll)
          sliderLeftOffset = slidesToOffset * slideWidth
        }
      }
    }

    sliderLeftOffset = ((currentSlide * slideWidth) * -1) + sliderLeftOffset
    return sliderLeftOffset
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
      count: Math.ceil(props.children.length / this.props.slidesToScroll),
      currentIndex: Math.ceil(this.state.currentSlide / this.props.slidesToScroll),
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
          <div className='slider_wrapper'
            ref={this.sliderWrapperRef}
            style={this.state.wrapperStyle}>
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
  fade: false,
  infinite: true,
  speed: 300,
  easeType: 'ease-in-out',
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

const fadeIn = function (node, speed, easeType, callback) {
  if (!node) {
    return
  }
  if (supportTransition) {
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

const fadeOut = function (node, speed, easeType, callback) {
  if (!node) {
    return
  }
  if (supportTransition) {
    node.style.opacity = 0
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

const slideAnimate = function (node, speed, easeType, from, to) {
  if (supportTransition) {
    node.style.transform = `translate3d(${to}px, 0px, 0px)`
    return
  }
  node.marginLeft = `${from}px`
  if (speed && to !== from) {
    let timer = null
    let change = to - from
    let start = from
    function done () {
      if (change > 0) {
        start += Math.abs(change / speed)
        if (start >= to) {
          timer && clearTimeout(timer)
          start = to
          node.style.marginLeft = `${start}px`
        } else {
          node.style.marginLeft = `${start}px`
          timer && clearTimeout(timer)
          timer = setTimeout(done, 16)
        }
      } else {
        start -= Math.abs(change / speed)* 16
        if (start <= to) {
          timer && clearTimeout(timer)
          start = to
          node.style.marginLeft = `${start}px`
        } else {
          node.style.marginLeft = `${start}px`
          timer && clearTimeout(timer)
          timer = setTimeout(done, 16)
        }
      }
    }
    timer = setTimeout(done, 16)
  } else {
    node.style.marginLeft = `${to}px`
  }
}

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