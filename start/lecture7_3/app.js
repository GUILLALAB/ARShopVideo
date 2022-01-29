import * as THREE from '../../libs/three125/three.module.js';
import { GLTFLoader } from '../../libs/three/jsm/GLTFLoader.js';
import { RGBELoader } from '../../libs/three/jsm/RGBELoader.js';
import { ARButton } from '../../libs/ARButton.js';
import { LoadingBar } from '../../libs/LoadingBar.js';


    let container;
    let camera, scene, renderer,source;
    let controller;

    let reticle;
    var video, texture,material;
    var isset=0;
    var mesh=null;
    let videoTexture;
    let videoImageContext ;
    let hitTestSource = null;
    let hitTestSourceRequested = false;
var slider,output;

  function myFunction() {
     // video.play();
       reticle.visible = true;
    }

    function PlayVideo(srcVideo){
      video.pause();
      source.src = srcVideo;
      video.load();
    }

    function StopVideo(){
      document.getElementById('video').pause();
    }

class App{
    constructor(){

         container = document.createElement( 'div' );
        document.body.appendChild( container );
        
        this.loadingBar = new LoadingBar();
        this.loadingBar.visible = false;

        this.assetsPath = '../../assets/ar-shop/';
        
        camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 20 );
        camera.position.set( 0, 1.6, 0 );
        
        scene = new THREE.Scene();

        const ambient = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
        ambient.position.set( 0.5, 1, 0.25 );
        scene.add(ambient);
            
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true } );
        renderer.setPixelRatio( window.devicePixelRatio );
        renderer.setSize( window.innerWidth, window.innerHeight );
        renderer.outputEncoding = THREE.sRGBEncoding;
        container.appendChild( renderer.domElement );
         slider = document.getElementById("myRange");

        this.setEnvironment();
        
        reticle = new THREE.Mesh(
            new THREE.RingBufferGeometry( 0.15, 0.2, 32 ).rotateX( - Math.PI / 2 ),
            new THREE.MeshBasicMaterial()
        );
        
        reticle.matrixAutoUpdate = false;
        reticle.visible = false;
        scene.add( reticle );
        
        this.setupXR();
        
        window.addEventListener('resize', this.resize.bind(this) );
        
    }
  

    setupXR(){
        renderer.xr.enabled = true;
        
        if ( 'xr' in navigator ) {

            navigator.xr.isSessionSupported( 'immersive-ar' ).then( ( supported ) => {

                if (supported){
                            document.getElementById("btn").addEventListener("click", myFunction);

                    const collection = document.getElementsByClassName("ar-button");
                    [...collection].forEach( el => {
                        el.style.display = 'block';
                    });
                }
            } );
            
        } 
        
        const self = this;

        this.hitTestSourceRequested = false;
        this.hitTestSource = null;
        
        function onSelect() {
            if (self.chair===undefined) return;
            
            if (self.reticle.visible){
                self.chair.position.setFromMatrixPosition( self.reticle.matrix );
                self.chair.visible = true;

                  if(isset==0){
    video = document.getElementById( 'video' );
    source = document.getElementById('source');
    PlayVideo("video.mp4");
    texture = new THREE.VideoTexture( video );
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBFormat;
    
    var geometry = new THREE.PlaneBufferGeometry( 2, 1);

    const vertexShader = document.getElementById("vertexShader").textContent;
    const fragmentShader = document.getElementById("fragmentShader").textContent;

      // Cria o material usandoff a urlVideoTexture

      material = new THREE.ShaderMaterial({
        transparent: true,
        uniforms: {
          map: { value: texture },
          keyColor: { value: [0.0, 1.0, 0.0] },
          similarity: { value: 0.74 },
          smoothness: { value: 0.0 }
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader
      });


      mesh = new THREE.Mesh( geometry, material);
      mesh.position.setFromMatrixPosition( reticle.matrix );
      scene.add( mesh );
      isset=1;
      video.play();
    }else{
            mesh.position.setFromMatrixPosition( reticle.matrix );
           mesh.lookAt(camera.position);
    }
            }
        }

        this.controller = renderer.xr.getController( 0 );
        this.controller.addEventListener( 'select', onSelect );
        
        scene.add( this.controller );
    }
    
    resize(){
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize( window.innerWidth, window.innerHeight ); 
    }
    
    setEnvironment(){
        const loader = new RGBELoader().setDataType( THREE.UnsignedByteType );
        const pmremGenerator = new THREE.PMREMGenerator( renderer );
        pmremGenerator.compileEquirectangularShader();
        
        const self = this;
        
        loader.load( '../../assets/hdr/venice_sunset_1k.hdr', ( texture ) => {
          const envMap = pmremGenerator.fromEquirectangular( texture ).texture;
          pmremGenerator.dispose();

          scene.environment = envMap;

        }, undefined, (err)=>{
            console.error( 'An error occurred setting the environment');
        } );
    }
    
    showChair(id){
        this.initAR();
        
        const loader = new GLTFLoader( ).setPath(this.assetsPath);
        const self = this;
        
        this.loadingBar.visible = true;
        
        // Load a glTF resource
        loader.load(
            // resource URL
            `chair${id}.glb`,
            // called when the resource is loaded
            function ( gltf ) {

                scene.add( gltf.scene );
                self.chair = gltf.scene;
        
                self.chair.visible = false; 
                
                self.loadingBar.visible = false;
                
                self.renderer.setAnimationLoop( self.render.bind(self) );
            },
            // called while loading is progressing
            function ( xhr ) {

                self.loadingBar.progress = (xhr.loaded / xhr.total);
                
            },
            // called when loading has errors
            function ( error ) {

                console.log( 'An error happened' );

            }
        );
    }           
    
    initAR(){
        let currentSession = null;
        const self = this;
        
        const sessionInit = { requiredFeatures: [ 'hit-test' ] };
        
        
        function onSessionStarted( session ) {

            session.addEventListener( 'end', onSessionEnded );

            self.renderer.xr.setReferenceSpaceType( 'local' );
            self.renderer.xr.setSession( session );
       
            currentSession = session;
            
        }

        function onSessionEnded( ) {

            currentSession.removeEventListener( 'end', onSessionEnded );

            currentSession = null;
            
            if (self.chair !== null){
                scene.remove( self.chair );
                self.chair = null;
            }
            
            self.renderer.setAnimationLoop( null );

        }

        if ( currentSession === null ) {

            navigator.xr.requestSession( 'immersive-ar', sessionInit ).then( onSessionStarted );

        } else {

            currentSession.end();

        }
    }
    
    requestHitTestSource(){
        const self = this;
        
        const session = renderer.xr.getSession();

        session.requestReferenceSpace( 'viewer' ).then( function ( referenceSpace ) {
            
            session.requestHitTestSource( { space: referenceSpace } ).then( function ( source ) {

                self.hitTestSource = source;

            } );

        } );

        session.addEventListener( 'end', function () {

            self.hitTestSourceRequested = false;
            self.hitTestSource = null;
            self.referenceSpace = null;

        } );

        this.hitTestSourceRequested = true;

    }
    
    getHitTestResults( frame ){
        const hitTestResults = frame.getHitTestResults( this.hitTestSource );

        if ( hitTestResults.length ) {
            
            const referenceSpace = renderer.xr.getReferenceSpace();
            const hit = hitTestResults[ 0 ];
            const pose = hit.getPose( referenceSpace );

            reticle.visible = true;
            reticle.matrix.fromArray( pose.transform.matrix );

        } else {

            reticle.visible = false;

        }

    }
    
    render( timestamp, frame ) {

        if ( frame ) {
            if ( this.hitTestSourceRequested === false ) this.requestHitTestSource( )

            if ( this.hitTestSource ) this.getHitTestResults( frame );
        }

    if(video!=null)
        {
                        reticle.visible = false;
          if ( video.readyState === video.HAVE_ENOUGH_DATA ) 
          {
            if ( texture ) 
              texture.needsUpdate = true;
          }
                  if(mesh!=null){

          slider.oninput = function() {
 // mesh.scale.set(slider.value,slider.value,slider.value);
 mesh.scale.x = slider.value;
  mesh.scale.y = slider.value;

}
}
        }

        renderer.render( scene, camera );

    }
}

export { App };