define(['postmonger'], function (Postmonger) {
    'use strict';
    
    var connection = new Postmonger.Session();
    var authTokens = {};
    var payload = {};
   
    // Configuration variables
    let herokuURL = "https://sg-split-app-tiger-dev.herokuapp.com/";
    let phoneAttrSchema = ''; //Contact:Phone
    let eventSchema = ''; // Contact:
    let firstnameSchema = ''; //First Name || FirstName
    let lastnameSchema = ''; //Last Name || LastName
    let tabCounter = 1;
    const addPathButton = document.querySelector(".tabNav-addPath");


    $(window).ready(onRender);

    connection.on('initActivity', initialize);
    connection.on('requestedTokens', onGetTokens);
    connection.on('requestedEndpoints', onGetEndpoints);
    connection.on('clickedNext', save); //Save function within MC

    function onRender() {
        // JB will respond the first time 'ready' is called with 'initActivity'
        connection.trigger('ready');
        connection.trigger('requestTokens');
        connection.trigger('requestEndpoints');
    }

    let eventDefinitionKey;
    connection.trigger('requestTriggerEventDefinition');
    connection.on('requestedTriggerEventDefinition',function (eventDefinitionModel) {
        if (eventDefinitionModel) {
            eventDefinitionKey = eventDefinitionModel.eventDefinitionKey;
        }
    });
    
    function initialize(data) {
        if (data) {
            payload = data;
        }
        
        connection.trigger('updateButton', {
            button: 'next',
            text: 'done',
            visible: true
        });

        initialLoad(data);
        parseEventSchema();
        populateSFDCSelection();
        tabNavAddListener();
        addFieldAddListener();
    }

    function onGetTokens(tokens) {
        // Response: tokens = {token: <legacy token>, fuel2token: <fuel api token>}
        authTokens = tokens;
    }

    function onGetEndpoints(endpoints) {
        // Response: endpoints = { restHost: <url> } i.e "rest.mc.s4.exacttarget.com"
    }

    function save() {
        payload['outcomes'] = [];

        let tabNavArr = document.querySelectorAll('.tabNav-item:not(.clone-tabNav)');
        let tabContentArr = document.querySelectorAll('.tabContent-item:not(.clone-tabContent)');
        
        // Top level first gets created
        tabNavArr.forEach((tabNavItem) => {
            console.log('Name of Tab >> ',tabNavItem.innerHTML);
            console.log('Data of tab num >>', tabNavItem.dataset.tabnum);

            tabContentArr.forEach((tabContentItem) => {
                if (tabNavItem.dataset.tabnum == tabContentItem.dataset.tabnum) {
                    payload['outcomes'].push(
                        {
                            arguments: {
                                branchResult: tabNavItem.dataset.tabnum,
                                condition: []
                            },
                            metaData: {
                                label: tabNavItem.innerHTML
                            }
                        }
                    );
                }
                // Within this foreach function, have a forloop to go through the individual conditions that will need to be converted
                // The condition object have multiple arrays that will each contain a operator
                
            });
        });
        
        payload['metaData'].isConfigured = true;
        connection.trigger('updateActivity', payload);
    }


    /*
     * This is fired to fill in the data that has been pre-populated
     */
    function initialLoad (data) {
        //Initial instantiation of the payload
        let objArr = [];
        let savedData = data;
    };

    /**
    * This function is to pull the relevant information to create the schema of the objects
    * Case:Contact:<Object_Name>
    */
    function parseEventSchema() {
        // Pulling data from the schema
        connection.trigger('requestSchema');
        connection.on('requestedSchema', function (data) {
            let dataJson = data['schema'];

            populateJourneySelection(dataJson); //This function is nested within parseEventSchema to pull out the journey data to be placed in the dropdown

            for (let i = 0; i < dataJson.length; i++) {
                if (dataJson[i].key.indexOf("Phone") !== -1) {
                    let splitArr = dataJson[i].key.split(".");
                    phoneAttrSchema = splitArr[splitArr.length - 1];
                } else if (dataJson[i].key.indexOf("Mobile") !== -1) {
                    let splitArr = dataJson[i].key.split(".");
                    phoneAttrSchema = splitArr[splitArr.length - 1];
                }   
                
                // First name schema and creation of event schema
                if (dataJson[i].key.toLowerCase().replace(/ /g, '').indexOf("firstname") !== -1) {
                    // console.log('str splitted >> ',dataJson[i].key.split("."));
                    let splitArr = dataJson[i].key.split(".");
                    firstnameSchema = splitArr[splitArr.length - 1];
                    //console.log('First Name Schema >>', firstnameSchema);
                }

                // Last name schema and creation of event schema
                // Last name is a required field in SF so this is used to pull the event schema
                if (dataJson[i].key.toLowerCase().replace(/ /g, '').indexOf("lastname") !== -1) {
                    let splitArr = dataJson[i].key.split(".");
                    lastnameSchema = splitArr[splitArr.length - 1];
                    //console.log('Last Name Schema >>', lastnameSchema);

                    let splitName = lastnameSchema.split(":");
                    let reg = new RegExp(splitName[splitName.length - 1], "g");
                    let oldSchema = splitArr[splitArr.length - 1];
                    
                    eventSchema = oldSchema.replace(reg, "");
                    //console.log("Event Schema >>", eventSchema);
                }
            }
        });
    }

    /** 
    * Data is being pulled from parseEventSchema()
    * Function is nested inside parseEventSchema()
    * This function is used to populate the dropdown list 
    */
    function populateJourneySelection (data) {
        let sel = document.querySelectorAll(".inputField-object");
        console.log('DATA OF POPULATE JOURNEY SELECTION >>', data);
        for (let k = 0; k < sel.length; k++) {
            for (let i = 0; i < data.length; i++) {
                if (data[i].access == undefined) {
                    let splitName = data[i].key.split(":");
                    let filteredJourneyObject = splitName[splitName.length-1];
                    addOptionToSelect(sel[k], filteredJourneyObject, `{{Event.${eventDefinitionKey}.${eventSchema}${filteredJourneyObject}}}`, {lbl: 'Journey Data'} );
                }
            }
        }
    }

    /**
    * Data pulled from postgres 
    * The pulled Data will then populate the specific optgroup within select 
    * This pulls the schema of the 'Contact' Data
    * Check the activity.js routing function 'requestTableColumn' to understand what it pulls.
    */
    function populateSFDCSelection () {
        $.ajax({
            type: "GET",
            url: `${herokuURL}reqTableTemplate`,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function (data) {
                // On successfull AJAX call it'll pull the data down and create the appropriate cards on the page
                let sel = document.querySelectorAll(".inputField-object");
                for(let k=0; k < sel.length; k++) {
                    for (let i = 0; i < data.length; i++) {
                        // console.log('Column Name >>',data[i].column_name);
                        // function to place select into option
                        addOptionToSelect(sel[k], data[i].column_name, null, {lbl: 'Salesforce Data'});
                    }
                }
            },
            error: function (XMLHttpRequest, textStatus, errorThrown) {
                console.log("Status >> " + textStatus);
                console.log("Error >> " + errorThrown);
            }
        });
    }


    function tabNavAddListener() {
        let tabNavArr = document.querySelectorAll('.tabNav-item');
        tabNavArr.forEach((tabNavItem) => {
            tabNavItem.addEventListener('click', tabNavClick);
        });
    }


    function addFieldAddListener() {
        let addFieldbuttonArr = document.querySelectorAll(".addFieldButton");
        addFieldbuttonArr.forEach((addFieldBtn) => {
            addFieldBtn.addEventListener('click', addNewField);
        });
    }

    //Adding of a new path with tabnav and tabcontent
    addPathButton.addEventListener('click', function (e) {
        /** 
        * Clone the tab nav
        * Remove .hide / .clone-tabNav 
        * add a number into the innerhtml
        * add a number into the dataset-tabNum
        */
        console.log('this is clicked');
        let tabNavItem = document.querySelector(".clone-tabNav");
        let clonedTabNav = tabNavItem.cloneNode(true);
        clonedTabNav.classList.remove('hide');
        clonedTabNav.classList.remove('clone-tabNav');
        clonedTabNav.dataset.tabnum = tabCounter;
        clonedTabNav.innerHTML = `Path ${tabCounter}`;
        clonedTabNav.addEventListener('click', tabNavClick);

        /** 
        * Clone the tab content
        * Remove .hide / .clone-tabContent
        * add a number into the dataset-tabNum
        */
        let cloneTabContentItem = document.querySelector(".clone-tabContent");
        let clonedTabContent = cloneTabContentItem.cloneNode(true);
        clonedTabContent.classList.remove('hide');
        clonedTabContent.classList.remove('clone-tabContent');
        clonedTabContent.dataset.tabnum = tabCounter;

        /**
        * Add Event Listener for Adding of new Path Button
        */
        clonedTabContent.querySelector(".addFieldButton").addEventListener('click', addNewField);
        clonedTabContent.querySelector(".addFieldButton").dataset.tabnum = tabCounter;

        /** 
         * Increase counter for overall paths
         * Append the tabNav and tabContent into the document canvas
        */
        tabCounter++;
        document.querySelector(".clone-tabNav-container").appendChild(clonedTabNav);
        document.querySelector(".clone-tabContent-container").appendChild(clonedTabContent);
    });


    function tabNavClick(e) {
        let tabContentArr = document.querySelectorAll(".tabContent-item");
        removeActiveTabClass();
        // Adding of active class for the selected nav item
        this.classList.add('active');

        // Adding of active class for the content tab that looks at the same dataset.tabnum value
        tabContentArr.forEach((tabContentItem) => {
            if (tabContentItem.dataset.tabnum == this.dataset.tabnum) {
                tabContentItem.classList.add('active');
            }
        });
    }

    function removeActiveTabClass() {
        let tabNavArr = document.querySelectorAll('.tabNav-item');
        let tabContentArr = document.querySelectorAll(".tabContent-item");

        tabNavArr.forEach((tabNavItem) => {
            tabNavItem.classList.remove('active');
        });

        tabContentArr.forEach((tabContentItem) => {
            tabContentItem.classList.remove('active');
        })
    }

    function addNewField(e) {
        let cloneInputFieldRow = document.querySelector(".clone-inputField");
        let clonedInputFieldRow = cloneInputFieldRow.cloneNode(true);
        clonedInputFieldRow.classList.remove('hide');
        clonedInputFieldRow.classList.remove('clone-inputField');

        // Adding of clonsedInputFieldRow into the specific clone tab container
        let tabContentArr = document.querySelectorAll(".tabContent-item");
        tabContentArr.forEach((tabContentItem) => {
            if (tabContentItem.dataset.tabnum == e.target.dataset.tabnum) {
                console.log(e.target.dataset.tabnum, tabContentItem.dataset.tabnum);
                tabContentItem.querySelector(".cloned-container").appendChild(clonedInputFieldRow);
            }
        })
    }

    function replaceSpaceWithUnderscore (string) {
        let replacedString = string.replace(/ /g,"_");
        return replacedString
    }

    /**
    * https://www.dyn-web.com/tutorials/forms/select/option/dom-demo.php
    * 
    * addOptionToSelect arguments:
    *   sel: reference to select box
    *   txt: option text
    *   val: (optional) option value
    *   obj: (optional) object to hold either idx, el, grp or lbl
    *        to specify where the new option element should be inserted
    *        Examples for obj: {idx: 2} to insert before 3rd option
    *            {el: sel.options[2]} to insert before sel.options[2]
    *            {grp: 0} append to first optgroup
    *            {lbl: 'Group 2'} append to optgroup with label: 'Group 2'
    */
    function addOptionToSelect(sel, txt, val, obj) {
        let opt = document.createElement('option');
        opt.appendChild(document.createTextNode(txt));
        
        if (typeof val === 'string') {
            opt.value = val;
        }
        
        if (!obj) {
            sel.appendChild(opt);
            return;
        }
        
        let group;
        let el = (typeof obj.el === 'object')? obj.el: (typeof obj.idx === 'number')? sel.options[ obj.idx ]: null;
        if (el) {
            // not sel.insertBefore in case optgroup contains
            el.parentNode.insertBefore(opt, el);
            return;
        }
        
        let groups = sel.getElementsByTagName('optgroup');
        if (typeof obj.grp === 'number') {
            group = groups[ obj.grp ];
        } else if (typeof obj.lbl === 'string') {
            for (let i=0, len=groups.length; i<len; i++) {
                if ( groups[i].label === obj.lbl ) {
                    group = groups[i];
                    break;
                }
            }
        }
        if (group) { 
            group.appendChild(opt);
        }
        return;
    }

});