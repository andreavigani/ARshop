// PRODUCTS
// Load products from json file in homepage Top Selling section
$.getJSON("js/products.json", function(data) {
    $.each(data, function(key, value) {
        $('#products .row').append("<div class='col-sm-4 product'><img src='img/" + value.image + "'><hr><a id='" + value.id + "'><h3>" + value.name + "</h3></a><strong>" + value.price + "€</strong><p><a class='btn btn-default' id='" + value.id + "' role='button'>View details &raquo;</a></p></div>");
        // View details button click redirects to single product page passing product id in the url
        $('.product a').click(function() {
            var a_href = $(this).attr('id');
            window.location = 'product.html?product=' + a_href;
        });
    });
});

// Load products data from json file in single product page
var url = window.location.search;
var product = url.substring(url.indexOf('=') + 1);
var file;
$.getJSON("js/products.json", function(data) {
    var items = [];
    $.each(data, function(key, value) {
        if (product == value.id) {
            $('.product-image').css('margin-top', -$('#outCanvas').height());
            $('#start').css('margin-top', -$('#start').height());
            $('.product-image').attr("src", "img/" + value.image);
            $('.product-name').html(value.name);
            $('.product-price').html(value.price + '€');
            $('.product-description').html(value.description);
            file = value.file;
        }
    });
});
//AR CONTROLS
// Play/Stop AR marker detection handler on button click
var live = false;
$('#start').click(function() {
    live = !live;
    if (live === true) {
        $(this).addClass("live");
        $(this).html("<i class='fa fa-stop' aria-hidden='true'></i>Stop");
        $('.product-image').css('opacity', 0);
        $('.product-image').css('display', 'none');
        // If device is mobile show switch camera icon
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            $('.switch-camera').css('opacity', 0.7);
        }
        // Call start() function to start camera stream
        start();
    } else {
        $(this).html("<i class='fa fa-play' aria-hidden='true'></i>Start");
        $(this).removeClass("live");
        $('.product-image').css('margin-top', -$('#outCanvas').height());
        $('.product-image').css('opacity', 1);
        $('.product-image').css('display', 'block');
        $('.switch-camera').css('opacity', 0);
        var track = stream.getTracks()[0];
        track.stop();
    }
});

// Switch camera changing video source from video sources select and calling start() function to get the new video stream
var camera = false;
$('.switch-camera').click(function() {
    camera = !camera;
    if (camera === false) {
        $('select#videoSource option:eq(0)').attr('selected', 'selected');
        start();
    } else {
        $('select#videoSource option:eq(1)').attr('selected', 'selected');
        start();
    }
});

// Products navigation
$('.pager .previous').click(function() {
    var url = window.location.search;
    var product_n = parseInt(url.substring(url.indexOf('_') + 1)) - 1;
    if (product_n > 0) {
        window.location = 'product.html?product=product_' + product_n;
    } else {
        $(this).addClass('disabled');
    }
});
$('.pager .next').click(function() {
    var url = window.location.search;
    var product_n = parseInt(url.substring(url.indexOf('_') + 1)) + 1;
    window.location = 'product.html?product=product_' + product_n;
});

// AUGMENTED REALITY
// Set video and video sources elements
var videoElement = document.querySelector('#video');
var videoSelect = document.querySelector('select#videoSource');
var selectors = [videoSelect];
$('#outCanvas').height($('#outCanvas').width());

// Function to get all devices video sources
function gotDevices(deviceInfos) {
    //  Handles being called several times to update labels. Preserve values.
    var values = selectors.map(function(select) {
        return select.value;
    });
    selectors.forEach(function(select) {
        while (select.firstChild) {
            select.removeChild(select.firstChild);
        }
    });
    // Add all sources as options on hidden video select
    for (var i = 0; i !== deviceInfos.length; ++i) {
        var deviceInfo = deviceInfos[i];
        var option = document.createElement('option');
        option.value = deviceInfo.deviceId;
        if (deviceInfo.kind === 'videoinput') {
            option.text = deviceInfo.label || 'camera ' + (videoSelect.length + 1);
            videoSelect.appendChild(option);
        }
    }
    selectors.forEach(function(select, selectorIndex) {
        if (Array.prototype.slice.call(select.childNodes).some(function(n) {
                return n.value === values[selectorIndex];
            })) {
            select.value = values[selectorIndex];
        }
    });
    /*if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        $('select#videoSource option:eq(1)').attr('selected', 'selected');
    }*/
}

// Method that collects information about the media input and output devices available on the system.
navigator.mediaDevices.enumerateDevices()
    .then(gotDevices)
    .catch(errorCallback);

function errorCallback(error) {
    console.log('navigator.getUserMedia error: ', error);
}

// Start getting video streaming from selected source
function start() {
    if (window.stream) {
        window.stream.getTracks().forEach(function(track) {
            track.stop();
        });
    }
    var videoSource = videoSelect.value;
    var constraints = {
        audio: false,
        video: {
            deviceId: videoSource ? {
                exact: videoSource
            } : undefined
        }
    };
    navigator.mediaDevices.getUserMedia(constraints)
        .then(function(stream) {
            window.stream = stream; //  Make stream available to console
            videoElement.srcObject = stream;
            //  Refresh button list in case labels have become available
            return navigator.mediaDevices.enumerateDevices();
        })
        .then(gotDevices)
        .catch(errorCallback);
    // When video is ready start call start_processing function
    videoElement.onloadedmetadata = start_processing;

}

// Start marker detection and 3D products view
function start_processing(event) {

    //  Set up video and canvas
    var hvideo = document.getElementById("video");
    var hcanvas = document.getElementById("hiddenCanvas");
    var dcanvas = document.getElementById("drawingCanvas");
    var ocanvas = document.getElementById("outCanvas");
    $('#outCanvas').height('auto');
    hcanvas.width = ocanvas.width = dcanvas.width = hvideo.clientWidth;
    hcanvas.height = ocanvas.height = dcanvas.height = hvideo.clientHeight;
    hvideo.style.visibility = "hidden";

    // Setup JSARToolKit
    var ART_raster = new NyARRgbRaster_Canvas2D(hcanvas);
    var ART_param = new FLARParam(hcanvas.width, hcanvas.height);
    var ART_detector = new FLARMultiIdMarkerDetector(ART_param, 6);
    ART_detector.setContinueMode(true);

    // Setup three.js
    var renderer = new THREE.WebGLRenderer({
        canvas: dcanvas
    });
    renderer.autoClear = false;
    // Create the background plane and its own camera
    var bgTexture = new THREE.Texture(hcanvas);
    bgTexture.minFilter = THREE.LinearFilter;

    var bgPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.MeshBasicMaterial({
            map: bgTexture,
            depthTest: false,
            depthWrite: false
        })
    );
    var bgCamera = new THREE.Camera();
    var bgScene = new THREE.Scene();
    bgScene.add(bgPlane);
    bgScene.add(bgCamera);

    // Set up main scene and camera with JSART parameters
    var scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, hvideo.clientWidth / hvideo.clientHeight, 0.1, 1000);
    var tmp = new Float32Array(16);
    ART_param.copyCameraMatrix(tmp, 1, 10000);
    camera.projectionMatrix = ConvertCameraMatrix(tmp);
    scene.add(camera);

    // Convert camera matrix from JSARToolKit to Three.js
    function ConvertCameraMatrix(m) {
        myMat = new THREE.Matrix4();
        myMat.set(
            m[0], m[4], m[8], m[12],
            -m[1], -m[5], -m[9], -m[13],
            m[2], m[6], m[10], m[14],
            m[3], m[7], m[11], m[15]
        );
        return myMat;
    }

    // Convert marker matrix from JSARToolKit to Three.js
    function ConvertMarkerMatrix(m) {
        myMat = new THREE.Matrix4();
        myMat.set(
            m.m00, m.m02, -m.m01, m.m03,
            m.m10, m.m12, -m.m11, m.m13,
            m.m20, m.m22, -m.m21, m.m23,
            0, 0, 0, 1
        );
        return myMat;
    }

    // Create a container for 3D objects
    var container = new THREE.Object3D();
    container.matrixAutoUpdate = false;
    scene.add(container);

    // Set up light and it to the container
    var ambLight = new THREE.AmbientLight(0x909090, 2.0);
    container.add(ambLight);

    // Load the product's model

    var onLoad = function(geometry, materials) {
        /*var textureLoader =new THREE.TextureLoader();
        var texture = textureLoader.load("objects/outUVtexture.png");
        material =new THREE.MeshLambertMaterial({map:texture });*/
        material = new THREE.MultiMaterial(materials);
        object = new THREE.Mesh(geometry, material);
        // Get object geometry bounding box
        geometry.computeBoundingBox();
        // Change object y position to center the markers cube
        object.position.y = geometry.boundingBox.min.y;
        container.add(object);
    };
    // On progress start drawing the product's model on marker
    var onProgress = function() {
      // Process each frame
      setInterval(function() {
          // Update the hidden canvas and draw the webcam frame from hcanvas to dcanvas
          hcanvas.getContext("2d").drawImage(hvideo, 0, 0, hcanvas.width, hcanvas.height);
          hcanvas.changed = true;
          bgTexture.needsUpdate = true;

          // Draw background
          renderer.clear();
          renderer.render(bgScene, bgCamera);

          // Detect markers
          var markerCount = ART_detector.detectMarkerLite(ART_raster, 128);
          if (markerCount > 0) {
              // Create a NyARTransMatResult object for getting the marker translation matrices.
              tmat = new NyARTransMatResult();

              var markers = {};
              // Go through the detected markers and get their IDs and transformation matrices.
              for (var idx = 0; idx < markerCount; idx++) {
                  // Get the ID marker data for the current marker.
                  // ID markers are special kind of markers that encode a number.
                  // The bytes for the number are in the ID marker data.
                  id = ART_detector.getIdMarkerData(idx);
                  // Set orientation variable with the marker ID
                  orientation = id.getPacketData(1);

                  // Get the transformation matrix for the detected marker.
                  ART_detector.getTransformMatrix(idx, tmat);

                  // Reset object rotation
                  function resetRotation() {
                      object.rotation.x = 0;
                      object.rotation.y = 0;
                      object.rotation.z = 0;
                  }
                  // Change object rotation based on which marker is detected
                  if (orientation === 0) {
                      /*U*/
                      resetRotation();
                  } else if (orientation == 1) {
                      /*F*/
                      resetRotation();
                      object.rotation.x = -Math.PI / 2;
                  } else if (orientation == 2) {
                      /*B*/
                      resetRotation();
                      object.rotation.x = Math.PI / 2;
                      object.rotation.z = -Math.PI;
                  } else if (orientation == 3) {
                      /*D*/
                      resetRotation();
                      object.rotation.x = Math.PI;
                  } else if (orientation == 4) {
                      /*R*/
                      resetRotation();
                      object.rotation.z = Math.PI / 2;
                      object.rotation.y = -Math.PI;
                  } else if (orientation == 5) {
                      /*L*/
                      resetRotation();
                      object.rotation.z = -Math.PI / 2;
                      object.rotation.y = -Math.PI;
                  } else {
                      resetRotation();
                  }

              }
              // Convert container marker matrix using detected marker matrix
              container.matrix = ConvertMarkerMatrix(tmat);
            } else {
              // If no markers detected change container matrix
              // This operation is made to prevent video background texture to overlay object model texture
              container.matrix = ConvertMarkerMatrix(1);
            }
            // Draw object model
            renderer.render(scene, camera);

          // danvas now ready. Copy it to ocanvas to show it
          ocanvas.getContext("2d").drawImage(dcanvas, 0, 0, dcanvas.width, dcanvas.height);
      }, 40);
    };

    var onError = function(error) {
        console.log(error);
    };

    // Set up product model loader getting it from json products data
    var loader = new THREE.JSONLoader();
    var object;
    loader.load('objects/' + file + '.js', onLoad, onProgress, onError);

}
