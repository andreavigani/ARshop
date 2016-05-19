$.getJSON("js/products.json", function(data) {
    $.each(data, function(key, value) {
        $('#products .row').append("<div class='col-sm-4 product'><img src='img/" + value.image + "'><hr><a id='" + value.id + "'><h3>" + value.name + "</h3></a><strong>" + value.price + "€</strong><p><a class='btn btn-default' id='" + value.id + "' role='button'>View details &raquo;</a></p></div>");
        $('.product a').click(function() {
            var a_href = $(this).attr('id');
            window.location = 'product.html?product=' + a_href;
        });

    });
});

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

var videoElement = document.querySelector('#video');
var videoSelect = document.querySelector('select#videoSource');
var selectors = [videoSelect];
$('#outCanvas').height($('#outCanvas').width());

function gotDevices(deviceInfos) {
    // Handles being called several times to update labels. Preserve values.
    var values = selectors.map(function(select) {
        return select.value;
    });
    selectors.forEach(function(select) {
        while (select.firstChild) {
            select.removeChild(select.firstChild);
        }
    });
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
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        $('select#videoSource option:eq(1)').attr('selected', 'selected');
    }
}

navigator.mediaDevices.enumerateDevices()
    .then(gotDevices)
    .catch(errorCallback);

function errorCallback(error) {
    console.log('navigator.getUserMedia error: ', error);
}

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
            window.stream = stream; // make stream available to console
            videoElement.srcObject = stream;
            // Refresh button list in case labels have become available
            return navigator.mediaDevices.enumerateDevices();
        })
        .then(gotDevices)
        .catch(errorCallback);

    videoElement.onloadedmetadata = start_processing;

}

var live = false;
$('#start').click(function() {
    live = !live;
    if (live === true) {
        $(this).addClass("live");
        $(this).html("<i class='fa fa-stop' aria-hidden='true'></i>Stop");
        $('.product-image').css('opacity', 0);
        $('.product-image').css('display', 'none');
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            $('.switch-camera').css('opacity', 0.7);
        }
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

function start_processing(event) {

    // Set up video and canvas
    var hvideo = document.getElementById("video");
    var hcanvas = document.getElementById("hiddenCanvas");
    var dcanvas = document.getElementById("drawingCanvas");
    var ocanvas = document.getElementById("outCanvas");
    $('#outCanvas').height('auto');
    hcanvas.width = ocanvas.width = dcanvas.width = hvideo.clientWidth;
    hcanvas.height = ocanvas.height = dcanvas.height = hvideo.clientHeight;
    hvideo.style.visibility = "hidden";

    // setup JSARToolKit
    var ART_raster = new NyARRgbRaster_Canvas2D(hcanvas);
    var ART_param = new FLARParam(hcanvas.width, hcanvas.height);
    var ART_detector = new FLARMultiIdMarkerDetector(ART_param, 6);
    ART_detector.setContinueMode(true);

    // setup three.js
    var renderer = new THREE.WebGLRenderer({
        canvas: dcanvas
    });
    renderer.autoClear = false;
    // there is still no scene, camera and objects here...
    // create the background plane and its own camera
    var bgTexture = new THREE.Texture(hcanvas);
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

    // set up main scene and camera with JSART parameters
    var scene = new THREE.Scene();
    var camera = new THREE.Camera();
    var tmp = new Float32Array(16);
    ART_param.copyCameraMatrix(tmp, 1, 10000);
    camera.projectionMatrix = ConvertCameraMatrix(tmp);
    scene.add(camera);

    // convert marker matrix from JSARToolKit to Three.js
    function ConvertCameraMatrix(m) {
        myMat = new THREE.Matrix4();
        myMat.set(
            m[0], m[4], m[8], m[12], -m[1], -m[5], -m[9], -m[13],
            m[2], m[6], m[10], m[14],
            m[3], m[7], m[11], m[15]
        );
        return myMat;
    }

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

    // create a container with some stuff in it
    var container = new THREE.Object3D();
    container.matrixAutoUpdate = false;
    scene.add(container);
    var axisHelper = new THREE.AxisHelper(60);
    //container.add(axisHelper);


    // load the model
    var onLoad = function(geometry, materials) {
        var texture = THREE.ImageUtils.loadTexture( "objects/outUVtexture.png" );
        var material = new THREE.MeshBasicMaterial( { map : texture } );
        //var material = new THREE.MultiMaterial(materials);
        object = new THREE.Mesh(geometry, material);
        geometry.computeBoundingBox();
        object.position.y = geometry.boundingBox.min.y;
        container.add(object);
    };
    var onProgress = function() {
        // your optional on progress logic
    };
    var onError = function(error) {
        console.log(error);
    };

    var loader = new THREE.JSONLoader();
    var object;
    loader.load('objects/' + file + '.js', onLoad, onProgress, onError);

    var ambLight = new THREE.AmbientLight(0x909090, 2.0);
    container.add(ambLight);

    // process each frame
    setInterval(function() {
        // update the hidden canvas
        hcanvas.getContext("2d").drawImage(hvideo, 0, 0, hcanvas.width, hcanvas.height);
        hcanvas.changed = true;
        bgTexture.needsUpdate = true;
        // here we will draw the webcam frame from hcanvas to dcanvas
        // draw background
        renderer.clear();
        renderer.render(bgScene, bgCamera);

        // detect markers
        var markerCount = ART_detector.detectMarkerLite(ART_raster, 128);
        if (markerCount > 0) {
            var tmat = new NyARTransMatResult();
            // Create a NyARTransMatResult object for getting the marker translation matrices.

            var markers = {};
            var orientation;
            // Go through the detected markers and get their IDs and transformation matrices.
            for (var idx = 0; idx < markerCount; idx++) {
                // Get the ID marker data for the current marker.
                // ID markers are special kind of markers that encode a number.
                // The bytes for the number are in the ID marker data.
                var id = ART_detector.getIdMarkerData(idx);
                orientation = id.getPacketData(1);

                // Get the transformation matrix for the detected marker.
                ART_detector.getTransformMatrix(idx, tmat);

            }

            // here we will draw the 3D objects to dcanvas
            function resetRotation() {
                object.rotation.x = 0;
                object.rotation.y = 0;
                object.rotation.z = 0;
            }

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

            container.matrix = ConvertMarkerMatrix(tmat);

            renderer.render(scene, camera);
        }

        // dcanvas now ready. Copy it to ocanvas to show it
        ocanvas.getContext("2d").drawImage(dcanvas, 0, 0, dcanvas.width, dcanvas.height);
    }, 40);
}
