
var PdfDisplayer = function (){
    var pdfjsLib = window['pdfjs-dist/build/pdf'];
    pdfjsLib.GlobalWorkerOptions.workerSrc = '//mozilla.github.io/pdf.js/build/pdf.worker.js';

    var pdf = 0;
    var pageNumber = 1;


    var showPage = function(pageNumber) {
        pdf.getPage(pageNumber).then(function(page) {
            console.log('Page loaded');

            var scale = 1.5;
            var viewport = page.getViewport(scale);

            // Prepare canvas using PDF page dimensions
            var canvas = document.getElementById("pres_canvas");
            var context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            // Render PDF page into canvas context
            var renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            var renderTask = page.render(renderContext);
            renderTask.then(function () {
                console.log('Page rendered');
            });
        });
    };

    var publicMethods = {
        "loadPdf" : function (pdfData) {
            var loadingTask = pdfjsLib.getDocument({data: pdfData});
            loadingTask.promise.then(function(pdf_) {
                pdf = pdf_;
                pageNumber = 1;
                showPage(pageNumber);
            }, function (reason) {
                // PDF loading error
                console.error(reason);
            });
        },
        "showPage" : showPage,
        "incrementPage" : function () {
            pageNumber++;
            showPage(pageNumber);
        },
        "decrementPage" : function () {
            pageNumber--;
            showPage(pageNumber);
        },
        "getPageNumber" : function () {
            return pageNumber;
        },
    };

    return publicMethods;
};

var a = function() {
    var pdfDisplayer = PdfDisplayer();

    var roleEnum = {"none" : 0, "presenter" : 1, "partaker" : 2}; 
    var role = roleEnum.none;
    var getRoleString = function () {
        var roleInv = ["none", "presenter", "partaker"];
        return roleInv[role];
    };

    var joinToken = 0;
    var socket = 0;

    var handleFiles = function () {
        var file = this.files[0];
        fileUpload(file);
        role = roleEnum.presenter;
    };

    var openControlWebsocket = function () {
        socket = new WebSocket('ws://localhost:8765');
        socket.addEventListener('open', function (event) {
            data = {joinToken : joinToken, role : getRoleString()};
            socket.send(JSON.stringify(data));
        });

        socket.addEventListener('message', function (event) {
            console.log('Message from server ', event.data);
            // incrementPage();
        });
    };

    var doPartake = function (e) {
        role = roleEnum.partaker;
        // do AJAX request to send join token to the server
        joinToken = $('#join_token_input').val()
        var data = { joinToken : joinToken,};
        $.post("partake", data, 
            function (data, textStatus, jqXHR) {
                pdfDisplayer.loadPdf(data);
                openControlWebsocket();
            },
            "text"
        );
    };

    var fileUpload = function(file) {
        var reader = new FileReader();
        var xhr = new XMLHttpRequest();
        this.xhr = xhr;
        xhr.open("POST", "fileupload");
        xhr.overrideMimeType('text/plain; charset=x-user-defined-binary');

        reader.onload = function(evt) {
            xhr.send(evt.target.result);
            pdfDisplayer.loadPdf(evt.target.result);
        };
        
        xhr.addEventListener("error", function(e){
            console.log(e);
        }, false);
        xhr.addEventListener("load", function(e){
            response = JSON.parse(xhr.response);
            $("#join_token").append(response["join_token"]);
            joinToken = response["join_token"];
        }, false);

        reader.readAsBinaryString(file);
    };

    var sendPageNumber = function () {
        var data = { joinToken : joinToken, pageNumber : pdfDisplayer.getPageNumber() };
        $.post("setpage", data);
    };

    $(document).keydown(function (e) {
        if (role != roleEnum.presenter) {
            return;
        }

        var keyCode = e.originalEvent.keyCode;
        switch(keyCode) {
            case 39:
                pdfDisplayer.incrementPage();
                sendPageNumber();
                break;
            case 37:
                pdfDisplayer.decrementPage();
                sendPageNumber();
                break;
        }
    });

    var inputElement = document.getElementById("input");
    inputElement.addEventListener("change", handleFiles, false);

    $(".partake_btn").click(doPartake);
};

$(document).ready(a);
