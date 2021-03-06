/* XSLT service 
 * Open Siddur Project
 * Copyright 2013-2014 Efraim Feinstein <efraim@opensiddur.org>
 * Licensed under the GNU Lesser General Public License, version 3 or later
 */
OpenSiddurClientApp.service(
    'XsltService',
    ['$rootScope', '$http', '$location', 'ErrorService',
    function ( $rootScope, $http, $location, ErrorService ) {
        // initialize all of the stylesheets
        svc = {
            xsltProcessors : {},
            addProcessor : function ( processorName, path ) {
                this.xsltProcessors[processorName] = path; 
            },
            transform : function ( processorName, domDoc, parameters ) {
                var transformed = Saxon.run({
                    stylesheet : (processorName.indexOf("/") == 0) ? processorName : this.xsltProcessors[processorName],
                    source : domDoc,
                    parameters : parameters,
                    method : "transformToDocument",
                    errorHandler : function (err) {
                        ErrorService.addAlert(err.message, "error");
                    },
                    logLevel : "SEVERE"
                });
                return transformed.getResultDocument();
            },
            clearEntities : function(str) {
                // clear all [known] entities that show up in this._content and replace them with numerics.
                // use it before save
                return str.replace(/&nbsp;/g, "&#160;");
            },
            transformString : function ( processorName, data, parameters ) {
                var dataDomDoc = Saxon.parseXML(this.clearEntities(data));
                return this.transform(processorName, dataDomDoc, parameters);
            },
            serializeToString : function ( doc ) {
                return ((new window.XMLSerializer()).serializeToString(doc))
                    .replace(/\s+xmlns:xml="http:\/\/www.w3.org\/XML\/1998\/namespace"/g, "");
            },
            TEINSClean : function(strdoc, includeFlat) {
                return strdoc.replace(/\s+xmlns(:[a-zA-Z0-9]+)?=["][^"]+["]/g, "")
                    // replace first instance of an element 
                    .replace(/\<([a-zA-Z:]+)/, "<$1 xmlns:tei=\"http://www.tei-c.org/ns/1.0\" xmlns:j=\"http://jewishliturgy.org/ns/jlptei/1.0\"" + (includeFlat ? " xmlns:jf=\"http://jewishliturgy.org/ns/jlptei/flat/1.0\"" : ""))
                    // jf:merged in flat documents has to have default html ns
                    .replace(/\<jf:merged/, "<jf:merged xmlns=\"http://www.w3.org/1999/xhtml\"");

            },
            serializeToStringTEINSClean : function (doc, includeFlat) {
                // serialize to string, then clean up namespaces
                return this.TEINSClean(this.serializeToString(doc), includeFlat);
            },
            indentToString : function ( xmlDoc, includeFlat ) {
                return vkbeautify.xml(this.serializeToStringTEINSClean(xmlDoc, includeFlat), 4);  
            }  
        }
        svc.addProcessor('autoSegment', '/xsl/AutoSegment.xsl');
        svc.addProcessor('extractTranscriptionLinks', '/xsl/ExtractTranscriptionLinks.xsl');
        svc.addProcessor('instance', '/xsl/instance.xsl');
        svc.addProcessor('teiToHtml', '/xsl/tei2html.xsl');
        svc.addProcessor('htmlToTei', '/xsl/html2tei.xsl');
        svc.addProcessor('listXmlId', '/xsl/ListXmlId.xsl');
        svc.addProcessor('originalTemplate', '/xsl/originaltemplate.xsl');
        svc.addProcessor('originalBeforeSave', '/xsl/OriginalBeforeSave.xsl');
        svc.addProcessor('profileFormTemplate', '/xsl/profileformtemplate.xsl');
        svc.addProcessor('sourceFormTemplate', '/xsl/sourceformtemplate.xsl');
        svc.addProcessor('styleBeforeSave', '/xsl/StyleBeforeSave.xsl');
        svc.addProcessor('templateNewOriginal', '/templates/original.xsl');
        svc.addProcessor('templateNewConditionals', '/templates/conditionals.xsl');
        svc.addProcessor('templateNewAnnotations', '/templates/annotations.xsl');
        svc.addProcessor('templateNewStyle', '/templates/styles.xsl');
        svc.addProcessor('cleanupForm', '/xsl/cleanupform.xsl');
        svc.addProcessor('addXmlId', '/xsl/add-xml-id.xsl');
        svc.addProcessor('wordify', '/xsl/wordify.xsl');
        return svc;
    }]
);

