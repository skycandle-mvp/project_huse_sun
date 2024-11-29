import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import * as TWEEN from 'tween.js'
import * as Stats from 'stats.js'

export class basicThree {
  constructor() {
    this.container = document.querySelector('#sunshine')
    this.modelScale = 1 // 模型缩放倍数
    this.modelUrl = null // 模型URL

    // three 3要素
    this.renderer = null
    this.camera = null
    this.scene = null

    // 光源
    this.ambientLight = null
    this.sunLight = null

    // 摄像头控制
    this.controls = null
    this.renderEvents = []

    // 记录原始的旋转中心点
    this.originalTarget = null

    this.init()
  }

  init() {
    this.initScene()
    this.initCamera()
    this.initRender()
    this.orbitHelper()
    this.statsHelper()
    this.animate()

    window.onresize = this.onWindowResize.bind(this)
  }

  // 场景初始化
  initScene() {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color('#eef5ff')

    // 使用环境光照亮整个场景
    const ambientLight = new THREE.AmbientLight(0xffffff, 1)
    this.scene.add(ambientLight)
  }

  // 渲染器初始化
  initRender() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      logarithmicDepthBuffer: true,
    })

    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    this.container.appendChild(this.renderer.domElement)
  }

  // 相机初始化
  initCamera() {
    this.camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        1,
        3000
    )
    this.camera.position.set(200, 300, 300)
    this.camera.lookAt(0, 0, 0)
  }

  // 光照初始化
  initLight() {
    this.sunLight = new THREE.DirectionalLight(0xffffff, 1)
    this.sunLight.position.set(0, 100, 0)
    this.sunLight.castShadow = true

    this.sunLight.shadow.mapSize.width = 2048
    this.sunLight.shadow.mapSize.height = 2048
    this.sunLight.shadow.camera.near = 1
    this.sunLight.shadow.camera.far = 1000
    this.sunLight.shadow.camera.left = -500
    this.sunLight.shadow.camera.right = 500
    this.sunLight.shadow.camera.top = 500
    this.sunLight.shadow.camera.bottom = -500

    this.scene.add(this.sunLight)
  }

  // 加载3D模型
  loadModel() {
    const loader = new GLTFLoader()
    const dracoLoader = new DRACOLoader()

    dracoLoader.setDecoderPath('./draco/')
    dracoLoader.setDecoderConfig({ type: 'js' })
    dracoLoader.preload()
    loader.setDRACOLoader(dracoLoader)

    loader.load(
        this.modelUrl,
        (gltf) => {
          const model = gltf.scene

          model.traverse((child) => {
            if (child.isMesh) {
              const copyMaterial = child.material.clone()
              copyMaterial.side = THREE.DoubleSide
              copyMaterial.originColor = copyMaterial.color.clone()
              copyMaterial.color.setHex(0xfffff0)
              child.material = copyMaterial

              child.castShadow = true
              child.receiveShadow = true
            }
          })

          model.scale.set(this.modelScale, this.modelScale, this.modelScale)
          this.building = gltf.scene
          this.scene.add(gltf.scene)
        },
        undefined,
        (error) => {
          console.error('Error loading model:', error)
        }
    )
  }

  // 初始化模型和地面
  initModel() {
    this.loadModel()
    this.initLight()
    this.basicfloor()
  }

  // 地面（地图）设置
  basicfloor() {
    const planeGeometry = new THREE.PlaneGeometry(500, 500)

    const texture = new THREE.TextureLoader().load(
        './bg.png',
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace
          texture.minFilter = THREE.LinearFilter
          texture.magFilter = THREE.LinearFilter
          texture.needsUpdate = true

          texture.wrapS = THREE.ClampToEdgeWrapping
          texture.wrapT = THREE.ClampToEdgeWrapping
        },
        undefined,
        (error) => {
          console.error('Error loading texture:', error)
        }
    )

    const planeMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1,
    })

    this.plane = new THREE.Mesh(planeGeometry, planeMaterial)
    this.plane.rotation.x = -Math.PI / 2
    this.plane.position.y = 0

    this.scene.add(this.plane)
  }

  // 控制器设置
  orbitHelper() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05

    this.controls.minDistance = 100
    this.controls.maxDistance = 1000
    this.controls.maxPolarAngle = Math.PI / 2 - 0.1

    this.originalTarget = this.controls.target.clone()

    // 指南针
    this.controls.addEventListener('change', () => {
      const rotation = this.camera.rotation
      let rotationDegrees = {
        x: THREE.MathUtils.radToDeg(rotation.x),
        y: THREE.MathUtils.radToDeg(rotation.y),
        z: THREE.MathUtils.radToDeg(rotation.z),
      }
      document.querySelector(".compass>div").style.transform =
          "rotate(" + rotationDegrees.z + "deg)"
    })
  }

  // 性能监控
  statsHelper() {
    this.stats = new Stats()
    this.stats.dom.style.top = '100px'
    document.body.appendChild(this.stats.dom)
  }

  // 窗口大小变化处理
  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.render()
  }

  // 渲染
  render() {
    if (this.stats) this.stats.update()
    this.renderer.render(this.scene, this.camera)
    this.controls.update()
    TWEEN.update()

    this.renderEvents.forEach((event) => {
      if (event && typeof event === 'function') {
        event()
      }
    })
  }

  // 注册渲染事件
  registRenderEvent(event) {
    this.renderEvents.push(event)
  }

  // 动画循环
  animate() {
    requestAnimationFrame(this.animate.bind(this))
    this.render()
  }
}