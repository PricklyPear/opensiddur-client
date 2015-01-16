/* 
 * controller for texts page, which is the generic XML editor 
 * Open Siddur Project
 * Copyright 2013-2014 Efraim Feinstein <efraim@opensiddur.org>
 * Licensed under the GNU Lesser General Public License, version 3 or later
 */
OpenSiddurClientApp.controller(
    'TextsCtrl',
    ['$scope', '$location', '$route', '$routeParams', '$timeout', '$window', 'XsltService', 
    'AccessService', 'AuthenticationService', 'DialogService', 'ErrorService', 'RestApi',
    'TextService',
    function ($scope, $location, $route, $routeParams, $timeout, $window, XsltService, 
        AccessService, AuthenticationService, DialogService, ErrorService, RestApi,
        TextService) {
        console.log("Texts controller.");
        $scope.selection = "";
        $scope.DialogService = DialogService;

        // state associated with the resource type
        $scope.resourceType = {
            "texts" : {
                path : "texts",
                type : "original",
                api : "/api/data/original",
                supportsAccess : true,
                supportsCompile : true,
                supportsTranscriptionView : true,
                loadFlat : true,
                defaultTitle : "New text",
                editorMode : "xml"
            },
            "conditionals" : {
                path : "conditionals",
                type : "conditionals",
                api : "/api/data/conditionals",
                supportsAccess : false,
                supportsCompile : false,
                supportsTranscriptionView : true,
                loadFlat : false,
                defaultTitle : "New conditional",
                editorMode : "xml"
            },
            "annotations" : { 
                path : "annotations",
                type : "annotations",
                api : "/api/data/notes",
                supportsAccess : true,
                supportsCompile : false,
                supportsTranscriptionView : true,
                loadFlat : false,
                defaultTitle : "New annotations",
                editorMode : "xml"
            },
            "styles" : { 
                path : "styles",
                type : "styles",
                api : "/api/data/styles",
                supportsAccess : true,
                supportsCompile : false,
                supportsTranscriptionView : false,
                loadFlat : false,
                defaultTitle : "New style",
                editorMode : "css"
            },
            current : null,
            initAs : function (type) {
                this.current = this[type];
            }
        };
        $scope.resourceType.initAs($location.path().split("/")[1]);

        $scope.TextService = TextService;
        $scope.AccessService = AccessService;

        // this should be in $scope.editor, but ng-ckeditor will not allow it to be (see line 73)
        $scope.ckeditorOptions = {
            customConfig : "/js/ckeditor/config.js",    // points to the plugin directories
            entities : false,   // need XML entities, but not HTML entities...
            extraPlugins : "tei-seg",
            fillEmptyBlocks : false,
            language : "en",
            readOnly : !AccessService.access.write,
            toolbar : "basic",
            toolbar_full : [],
            toolbarGroups : [
                { name: 'clipboard',   groups: [ 'clipboard', 'undo' ] },
                { name: 'document',    groups: [ 'mode', 'document', 'doctools' ] },
                { name: 'opensiddur', groups : [ 'opensiddur' ] }
/*
                { name: 'editing',     groups: [ 'find', 'selection' ] },
                { name: 'insert' },
                { name: 'forms' },
                { name: 'tools' },
                { name: 'document',    groups: [ 'mode', 'document', 'doctools' ] },
                { name: 'others' },
                '/',
                { name: 'basicstyles', groups: [ 'basicstyles', 'cleanup' ] },
                { name: 'paragraph',   groups: [ 'list', 'indent', 'blocks', 'align' ] },
                { name: 'styles' },
                { name: 'colors' },
                { name: 'about' }
*/
            ],
            removeButtons : 'Paste,PasteFromWord',
            allowedContent : "div[id](tei-seg);*[id,data-*]"
        };

        $scope.editor = {
            loggedIn : AuthenticationService.loggedIn,
            codemirrorOptions : {
                lineWrapping : true,
                lineNumbers : true,
                mode : $scope.resourceType.current.editorMode,
                tabSize : 4,
                indentUnit : 4,
                indentWithTabs : false,
                readOnly : !AuthenticationService.loggedIn,  // controlled by logged in state and access.write 
                autoCloseTags : {
                    whenClosing : true,
                    whenOpening : false
                },
                rtlMoveVisually : false
            },
            editableText : function(setContent) {
                if ($scope.resourceType.current.loadFlat) return TextService.flatContent(setContent);
                else if ($scope.resourceType.current.editorMode == "css") return TextService.stylesheet(setContent);
                else return TextService.content(setContent);
            },
            makeDirty : function(whatsChanged) {
                $scope.textsForm.$setDirty();
                return true;
            },
            title : "",
            isNew : 1,  // isNew=1 indicates that the document has not yet been saved
            isLoaded : 0,    // isLoaded=1 indicates that a document is loaded and ready to edit 
            newTemplate : null, // this is filled in by the new function
            newCanceled : function() {
            },
            newDocument : function() {
                // this function is called when the OK button is pressed from the new dialog
                // $scope.newTemplate contains a JS object that has to be passed to the template function
                console.log("Start a new document");
                $scope.editor.isNew = 1;
                // default access rights for a new file
                AccessService.reset();
                // load a new document template
                if (!$scope.editor.newTemplate.template.source) {
                    // default the source (this should happen in new dialog, but isn't because of a bug with defaulting
                    $scope.editor.newTemplate.template.source = "/exist/restxq/api/data/sources/Born%20Digital";
                    $scope.editor.newTemplate.template.sourceTitle = "An Original Work of the Open Siddur Project";
                }
                TextService.newDocument($scope.resourceType.current.api, $scope.editor.newTemplate, $scope.resourceType.current.loadFlat); 
                $scope.editor.title = TextService.title()[0].text;
                $scope.editor.isLoaded = 1;
                $location.path("/texts/" + $scope.editor.title, false);
                // work around a bug where the editor does not refresh after load
                setTimeout(
                    function() { 
                        $scope.editor.codemirror.editor.refresh(); 
                        // set the form dirty only after the location change has occurred
                        $scope.textsForm.$setDirty();
                    }, 250
                );
            },
            setDocument : function( toDocument, cursorLocation ) {
                if (toDocument) {
                    TextService.load($scope.resourceType.current.api, toDocument, $scope.resourceType.current.loadFlat)
                    .success(function(ts) {
                        if ($scope.resourceType.current.supportsAccess) {
                            AccessService.load($scope.resourceType.current.api, toDocument)
                            .success(function() {
                                $scope.editor.codemirror.readOnly = !AccessService.access.write; 
                            })
                            .error(function (error) {
                                ErrorService.addApiError(error);
                            });
                        };
                        $scope.editor.title = TextService.title()[0].text;
                        $scope.editor.isNew = 0;
                        $scope.editor.isLoaded = 1;
                        $scope.textsForm.$setPristine();
                        setTimeout(
                            function() { 
                                $scope.editor.codemirror.editor.refresh(); 
                                if (cursorLocation) {
                                    $scope.editor.codemirror.doc.setCursor(cursorLocation);
                                }
                            }, 250
                        );

                    })
                    .error(function(error) {    // error function
                        ErrorService.addApiError(error);
                        console.log("error loading", toDocument);
                        TextService.setResource("", "");
                    });
                }
            },
            saveDocument : function () {
                console.log("Save:", this);
                var httpOperation = (this.isNew) ? 
                    RestApi[$scope.resourceType.current.api].save : 
                    RestApi[$scope.resourceType.current.api].put;
                var resource = ((this.isNew) ? "" : TextService._resource);
                var content = TextService.content(); //$scope.editor.codemirror.doc.getValue();
                var transformed =
                    XsltService.transformString( "originalBeforeSave", content );
                    /* 
                    ($scope.resourceType.current.editorMode=="xml") ?
                        XsltService.transformString( "originalBeforeSave", content ) :
                        XsltService.transformString("styleBeforeSave", $scope.editor.loadedContent, 
                            { "style" : content});*/
                if (transformed) {
                    var indata = XsltService.serializeToStringTEINSClean(transformed);
                    jindata = $(indata);
                    if (jindata.prop("tagName") == "PARSERERROR") {
                        ErrorService.addAlert("Unable to save because the document could not be parsed. It probably contains some invalid XML.", "error");    
                    }
                    else if ($("tei\\:title[type=main]", jindata).text().length == 0 && 
                            $("tei\\:title[type=main]", jindata).children().length == 0) {
                        ErrorService.addAlert("A main title is required!", "error");
                    }
                    else {
                        httpOperation({"resource": resource}, indata,
                            function(data, headers) {   // success
                                $scope.textsForm.$setPristine();
                                if ($scope.editor.isNew) {
                                    // add to the search results listing
                                    $scope.editor.isNew = 0;
                                    var currentDocument=decodeURI(headers('Location').replace("/exist/restxq"+$scope.resourceType.current.api+"/", ""));
                                    TextService.setResource($scope.resourceType.current.api, currentDocument, $scope.resourceType.current.loadFlat);
                                    // save the access model for the new document
                                    if ($scope.resourceType.current.supportsAccess) {
                                        AccessService.setResource($scope.resourceType.current.api, currentDocument)
                                        .save()
                                        .error(function(error) {
                                            ErrorService.addApiError(error);
                                        });
                                    }
                                };
                                // reload the document to get the change log in there correctly
                                // add a 1s delay to allow the server some processing time before reload
                                setTimeout(
                                    function() { 
                                        $scope.editor.setDocument(TextService._resource, $scope.editor.codemirror.doc.getCursor()); 
                                    }, 1000
                                );
                            },
                            function(error) {
                                ErrorService.addApiError(error.data.xml);
                                console.log("error saving ", resource);
                            }
                        );
                    }
                }
            },
            newButton : function () {
                if ($location.path() == "/"+$scope.resourceType.current.path)
                    $route.reload();
                else 
                    $location.path( "/"+$scope.resourceType.current.path );
            },
            compile : function () {
                $window.open("/compile/" + TextService._resource);
            },
            loaded : function( _editor ) {
                console.log("editor loaded");
                $scope.editor.codemirror = {
                    editor : _editor,
                    doc : _editor.getDoc()
                };
                $scope.editor.codemirror.doc.markClean();
            },
            transcriptionViewer : false
        };
        $scope.saveButtonText = function() {
            return this.textsForm.$pristine ? (($scope.editor.isNew) ? "Unsaved, No changes" : "Saved" ) : "Save";
        };

        var selectionWatchCtr = 0;
        $scope.$watch("selection",
            function( selection ) { 
                if (!selectionWatchCtr) {
                    selectionWatchCtr++;
                }
                else {
                    var resourceName = decodeURIComponent(selection.split("/").pop());  // try to prevent double-encoding
                    if (resourceName && resourceName != TextService._resource)
                        $location.path( "/" + $scope.resourceType.current.path + "/" + resourceName );
                }
            }
        );

        $scope.helper = {
            link : {
                selectedType : $scope.resourceType.current.api,
                types : {
                    "/api/data/notes" : "Annotations",
                    "/api/user" : "Contributor",
                    "/api/data/original" : "Original text",
                    "/api/data/sources" : "Source",
                    "/api/data/conditionals" : "Conditional"
                },
                selection : "",
                insertable : "",
                insert : function (link) {
                    $timeout(function() { $scope.editor.codemirror.doc.replaceSelection(link, "end"); });
                    $scope.textsForm.$setDirty();
                },
                cancel : function() { ; }
            },
            xml : {
                getSelectedXmlIdRange : function () {
                    // return the (complete) elements and ids that are in the current selection
                    // can be filtered for a particular element type
                    var selection = $scope.editor.codemirror.doc.getSelection();
                    var elements = [];
                    selection.replace(/\<([^\>\s]+)[^\>]*xml:id=\"([^\"]+)\"/g, 
                        function(match, element, id) {
                            elements.push({ "element": element, "id": id });
                    });
                    return elements;
                },
                applyXslt : function ( xslt ) {
                    var position = $scope.editor.codemirror.doc.getCursor();
                    var content = TextService.content(); //$scope.editor.codemirror.doc.getValue();
                    var transformed = XsltService.transformString( xslt, content );
                    if (transformed) {
                        var str = XsltService.indentToString(transformed);
                        var jstr = $(str);
                        if (jstr.prop("tagName")=="PARSERERROR") {
                            ErrorService.addAlert("Unable to run the transform because the document could not be parsed. It probably contains some invalid XML.", "error");    
                        }
                        else {
                            TextService.content(str);
                        //$scope.$apply(); 
                        }
                        setTimeout(
                            function() { $scope.editor.codemirror.doc.setCursor(position) }, 250
                        );
                        //$scope.editor.ace.editor.clearSelection();
                    }
                },
                addIds : function () {
                    this.applyXslt( "addXmlId" );
                },
                segment : function () {
                    this.applyXslt ( "autoSegment" );
                },
                wordify : function () {
                    this.applyXslt( "wordify" );
                }
            }
        };
        $scope.$watch("helper.link.selection", function (newSelection) {
            $scope.helper.link.insertable = newSelection.replace(/^\/exist\/restxq\/api/, "")
        });

        $scope.editor.setDocument($routeParams.resource);

    }]
);
