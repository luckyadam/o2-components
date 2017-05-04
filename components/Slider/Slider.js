class Slider extends Base.Component {
  constructor () {
    super(...arguments)
    this.currentSlide = this.props.currentSlide
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
  
  componentWillMount () {
  }

  componentDidMount () {
    this.afterMount()
  }

  afterMount () {
    let slideWidth = getWidth(this.dom)
    let slideCount = this.slides.length
    let wrapperStyle = {}
    wrapperStyle.width = slideCount * slideWidth
    this.setState({
      mounted: true,
      slideWidth,
      slideCount,
      wrapperStyle
    }, () => {
      this.autoPlay()
    })
  }

  autoPlay () {
    this.autoPlayTimer && clearTimeout(this.autoPlayTimer)
    if (this.props.autoPlay) {
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
    nextIndex = this.currentSlide + this.props.slidesToScroll
    this.sliderTo(nextIndex)
  }

  pause () {

  }

  sliderTo (index) {
    let currentSlide
    let targetSlide
    const { fade, infinite, afterChange, beforeChange, speed } = this.props
    const { slideCount } = this.state
    if (fade) {
      currentSlide = this.currentSlide
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
      this.sliderItems.forEach((itemNode, i) => {
        if (i === targetSlide) {
          itemNode.style.zIndex = 1
          fadeIn(itemNode, speed, 'ease-in-out')
        } else if (i === currentSlide) {
          fadeOut(itemNode, speed)
          itemNode.style.zIndex = 0
        }
      })
      setTimeout(() => {
        this.currentSlide = targetSlide
        if (afterChange) {
          afterChange.call(targetSlide)
        }
      }, speed)
      
      this.autoPlay()
    }
  }

  canGoNext () {
    if (!this.props.infinite) {
      let slideCount = this.state.slideCount
      let slidesToShow = this.props.slidesToShow
      let currentSlide = this.currentSlide
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
    const isCurrent = this.currentSlide === index
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
    
    const arrowProps = {
      prevArrow: props.prevArrow, 
      nextArrow: props.nextArrow
    }
    if (props.arrows) {
      prevArrow = <PrevArrow {...arrowProps} />
      nextArrow = <NextArrow {...arrowProps} />
    }
    const indicatorsProps = {

    }
    if (props.indicators) {
      indicators = <Indicators {...indicatorsProps} />
    }
    let className = addClassName('slider', props.className)
    this.slides = this.renderSlides()
    return (
      <div className={className}>
        {prevArrow}
        <div className="slider_list" ref={this.sliderListRef}>
          <div className='slider_wrapper' style={this.state.wrapperStyle}>
            {this.slides}
          </div>
        </div>
        {nextArrow}
        {indicators}
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
  auto: false
}

function getWidth (node) {
  if (!node) {
    return 0
  }
  return node.getBoundingClientRect().width || node.offsetWidth
}

function addClassName (origin, newClassName) {
  origin = origin || ''
  origin = origin.split(' ')
  origin.push(newClassName)
  origin = origin.join(' ')
  return origin
}

function supportTransition () {
  return ('transition' in document.documentElement.style) || ('WebkitTransition' in document.documentElement.style)
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

class PrevArrow extends Base.Component {
  constructor () {
    super(...arguments)

  }

  render () {
    return <div></div>
  }
}

class NextArrow extends Base.Component {
  constructor () {
    super(...arguments)

  }

  render () {
    return <div></div>
  }
}

class Indicators extends Base.Component {
  constructor () {
    super(...arguments)

  }

  render () {
    return <div></div>
  }
}