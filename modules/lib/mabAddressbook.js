/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cu = Components.utils;

Cu.import("resource://react/lib/ical.1.2.2.js");

const description = "IndexedDB based Addressbook";
const UUID = "{7FBFCC76-48B6-11E6-9353-C50CE7BF5E87}";
const contractID = "@maddrbook/Addressbook;1";

const DB_NAME = 'addrbook';
const CONTACTS_STORE_NAME = 'contacts';
const DB_VERSION = 2;

const DB_ERR_NOT_CONN = "Connection to the database has not been opened, please make sure you called Addressbook.open()";

/**
* @constructor
* @param idb - IndexedDB Factory
**/
function Addressbook(idb) {
  this.indexedDB = idb;
};

/**
* Creates and opens databse.
* @param idb - IndexedDB Factory
**/
Addressbook.open = function(idb) {
  return new Addressbook(idb).open();
}

Addressbook.prototype = {
  // properties required for XPCOM registration:
  classDescription: description,
  classID:          Components.ID(UUID),
  contractID:       contractID,

/**	
* Open connection with db.
* @returns {Promise} - promise of open connection to db.
**/	
  open: function() {
    let addrbook = this;
    let indexedDB = this.indexedDB;

    return new Promise(function(resolve, reject) {
      var request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onsuccess = function(event) {
        addrbook._onsuccess(event);
        resolve(addrbook);
      };

      request.onerror = function(event) {
        addrbook._onerror(event);
        reject(event.target.error);
      };

      request.onupgradeneeded = function(event) {
        addrbook._onupgradeneeded(event);
      };
    });
  },

  _onsuccess: function(event) {
    this._db = event.target.result;

    if (this.onsuccess !== undefined) {
      this.onsuccess(event);
    }
  },
  _onerror: function(event) {

    if (this.onerror !== undefined) {
      this.onerror(event);
    }
  },
  _onupgradeneeded: function(event) {
    var db = event.target.result;

    // setup our object stores
    var contactsStore = db.createObjectStore(CONTACTS_STORE_NAME,
        { keyPath: "uuid", autoIncrement: true });

  /**
  * Set up indexes for db
  **/
    contactsStore.createIndex("name", "name", { unique: false });
  /**
  * Set up seed data for mock db
  **/
    contactsStore.add({name: "Simon Perreault", email: "simon.perreault@viagenie.ca" , jcards: [
      ["vcard", [
        ["version", {}, "text", "4.0"],
        ["fn", {}, "text", "Simon Perreault"],
        ["n", {}, "text", ["Perreault", "Simon", "", "", ["ing. jr", "M.Sc."]] ],
        ["bday", {}, "date-and-or-time", "--02-03"],
        ["anniversary", {}, "date-and-or-time", "2009-08-08T14:30:00-05:00" ],
        ["gender", {}, "text", "M"],
        ["lang", { "pref": "1" }, "language-tag", "fr"],
        ["lang", { "pref": "2" }, "language-tag", "en"],
        ["org", { "type": "work" }, "text", "Viagenie"],
        ["adr", { "type": "work" }, "text", [ "", "Suite D2-630", "2875 Laurier", "Quebec", "QC", "G1V 2M2", "Canada" ] ],
        ["tel", { "type": ["work", "voice"], "pref": "1" }, "uri", "tel:+1-418-656-9254;ext=102" ],
        ["tel", { "type": ["work", "cell", "voice", "video", "text"] }, "uri", "tel:+1-418-262-6501" ],
        ["email", { "type": "work" }, "text", "simon.perreault@viagenie.ca" ],
        ["geo", { "type": "work" }, "uri", "geo:46.772673,-71.282945"],
        ["key", { "type": "work" }, "uri", "http://www.viagenie.ca/simon.perreault/simon.asc" ],
        ["tz", {}, "utc-offset", "-05:00"],
        ["url", { "type": "home" }, "uri", "http://nomis80.org"]
      ]]
    ]});

    contactsStore.add({name: "Bob Perreault", email: "bob.perreault@viagenie.ca" , jcards: [
      ["vcard", [
        ["version", {}, "text", "4.0"],
        ["fn", {}, "text", "Bob Perreault"],
        ["n", {}, "text", ["Perreault", "Bob", "", "", ["ing. jr", "M.Sc."]] ],
        ["bday", {}, "date-and-or-time", "--02-03"],
        ["anniversary", {}, "date-and-or-time", "2009-08-08T14:30:00-05:00" ],
        ["gender", {}, "text", "M"],
        ["lang", { "pref": "1" }, "language-tag", "fr"],
        ["lang", { "pref": "2" }, "language-tag", "en"],
        ["org", { "type": "work" }, "text", "Viagenie"],
        ["adr", { "type": "work" }, "text", [ "", "Suite D2-630", "2875 Laurier", "Quebec", "QC", "G1V 2M2", "Canada" ] ],
        ["tel", { "type": ["work", "voice"], "pref": "1" }, "uri", "tel:+1-418-656-9254;ext=102" ],
        ["tel", { "type": ["work", "cell", "voice", "video", "text"] }, "uri", "tel:+1-418-262-6501" ],
        ["email", { "type": "work" }, "text", "bob.perreault@viagenie.ca" ],
        ["geo", { "type": "work" }, "uri", "geo:46.772673,-71.282945"],
        ["key", { "type": "work" }, "uri", "http://www.viagenie.ca/bob.perreault/bob.asc" ],
        ["tz", {}, "utc-offset", "-05:00"],
        ["url", { "type": "home" }, "uri", "http://nomis80.org"]
      ]]
    ]});
  },

  /**
  * Add contact to db.
  * @param contactObj - contact object
  * @returns {Promise} of ID of object in db.
  **/
  add: function(contactObj) {
    let ab = this;

    return this._contactRequest("readwrite", function(transaction) {
      contactObj = ab._convertFromICALComponent(contactObj);
      return transaction.add(contactObj);
    });
  },

  /**
  * Update a contact in the db.
  * @param contactObj - contact object
  * @returns {Promise}
  **/
  update: function(contactObj) {
    let ab = this;

    return this._contactRequest("readwrite",function(transaction) {
      contactObj = this._convertFromICALComponent(contactObj);
      return  transaction.put(contactObj);
    } );
  },

  /**
  * Return all contacts in db.
  * @returns {Promise} of an array of all contact objects in the db.
  **/
  getAll: function() {
    let ab = this;

    return this._contactRequest("readonly",
        function(transaction) {
          return  transaction.getAll();
        })
    .then(function(contacts) {
      return contacts.map(function(contact) {
        return ab._convertToICALComponent(contact);
      });
    });
  },

  /**
  * Return a contact.
  * @param id - id of contact required.
  * @return {Promise} of a contact
  **/
  getById: function(id) {
    let ab = this;

    return this._contactRequest("readonly",
        function(transaction) { return  transaction.get(id); } )
      .then(function(contact) { return ab._convertToICALComponent(contact);  } );
  },
  /**
  * Delete contact by id
  * @param {Integer} id - id of contact to be deleted.
  * @returns {Promise} to delete contact of input id
  **/
  deleteById: function(id) {
    return this._contactRequest("readwrite",function(transaction) { return  transaction.delete(id); } );
  },
  /**
  * Returns all names and IDs in the db.
  * @returns {Promise} - of all names and IDs in db.
  **/
  getNameAndId: function() {

    let db = this._db;

    return new Promise(function(resolve, reject) {

      // check to see if db exists
      if (db === undefined) {
        reject(DB_ERR_NOT_CONN);
        return;
      }

      // setup transaction
      var transaction = db.transaction([CONTACTS_STORE_NAME], "readonly")
        .objectStore(CONTACTS_STORE_NAME)
        .index("name");

      // create request
      var request = transaction.openKeyCursor();

      // initalise results
      var results = [];

      // setup response functions
      request.onsuccess = function(event) {
        var cursor = event.target.result;
        if (cursor) {
          results.push({ uuid: cursor.primaryKey, name: cursor.key });
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = function(event) {
        reject(event.target.error);
      };
    });
  },

  /**
  * @param contactObj - object which describes a contact in the db.
  * @returns ICAL equivalent to input
  **/
  _convertToICALComponent: function(contactObj) {
    // TODO: refactor contactObj as separate
    var result = contactObj;

    result.jcards = result.jcards.map(function(jcard) {
      return new ICAL.Component(jcard);
    });
    return result;
  },

  /**
  * @param ICAL version of contact object
  * @returns contactObj - object which describes a contact in the db. converted from input.
  **/
  _convertFromICALComponent: function(contactObj) {
    var result = contactObj;

    result.jcards = result.jcards.map(function(jcard) {
      // check if the jcard is in the array format
      if (Array.isArray(jcard)) {
        // is presumably a in array jCard format
        // validate it by parsing it as a Component then convert it back into jCard
        return new ICAL.Component(jcard).toJSON();
      } else {
        // jcard is an ICAL.Component, so convert it to jCard
        return jcard.toJSON();
      }
    });
    return result;
  },

  /**
  * @param {string} access -  level of access to db needed.
  * @param {function} requestFn - takes an IDB transaction
  * @returns {Promise} - the result of the request function
  **/
  _contactRequest: function(access, requestFn) {

    let db = this._db;

    return new Promise(function(resolve, reject) {

      // check to see if db exists
      if (db === undefined) {
        reject(DB_ERR_NOT_CONN);
        return;
      }

      // setup transaction
      var transaction = db.transaction([CONTACTS_STORE_NAME], access)
        .objectStore(CONTACTS_STORE_NAME);

      // create request
      var request = requestFn(transaction);

      // setup response functions
      request.onerror = function(event) {
        reject(event.target.error);
      };
      request.onsuccess = function(event) {
        resolve(event.target.result);
      };
    });
  }
};