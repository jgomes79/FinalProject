var Web3 = require("web3");
var SolidityEvent = require("web3/lib/web3/event.js");

(function() {
  // Planned for future features, logging, etc.
  function Provider(provider) {
    this.provider = provider;
  }

  Provider.prototype.send = function() {
    this.provider.send.apply(this.provider, arguments);
  };

  Provider.prototype.sendAsync = function() {
    this.provider.sendAsync.apply(this.provider, arguments);
  };

  var BigNumber = (new Web3()).toBigNumber(0).constructor;

  var Utils = {
    is_object: function(val) {
      return typeof val == "object" && !Array.isArray(val);
    },
    is_big_number: function(val) {
      if (typeof val != "object") return false;

      // Instanceof won't work because we have multiple versions of Web3.
      try {
        new BigNumber(val);
        return true;
      } catch (e) {
        return false;
      }
    },
    merge: function() {
      var merged = {};
      var args = Array.prototype.slice.call(arguments);

      for (var i = 0; i < args.length; i++) {
        var object = args[i];
        var keys = Object.keys(object);
        for (var j = 0; j < keys.length; j++) {
          var key = keys[j];
          var value = object[key];
          merged[key] = value;
        }
      }

      return merged;
    },
    promisifyFunction: function(fn, C) {
      var self = this;
      return function() {
        var instance = this;

        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};
        var last_arg = args[args.length - 1];

        // It's only tx_params if it's an object and not a BigNumber.
        if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);

        return new Promise(function(accept, reject) {
          var callback = function(error, result) {
            if (error != null) {
              reject(error);
            } else {
              accept(result);
            }
          };
          args.push(tx_params, callback);
          fn.apply(instance.contract, args);
        });
      };
    },
    synchronizeFunction: function(fn, instance, C) {
      var self = this;
      return function() {
        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};
        var last_arg = args[args.length - 1];

        // It's only tx_params if it's an object and not a BigNumber.
        if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);

        return new Promise(function(accept, reject) {

          var decodeLogs = function(logs) {
            return logs.map(function(log) {
              var logABI = C.events[log.topics[0]];

              if (logABI == null) {
                return null;
              }

              var decoder = new SolidityEvent(null, logABI, instance.address);
              return decoder.decode(log);
            }).filter(function(log) {
              return log != null;
            });
          };

          var callback = function(error, tx) {
            if (error != null) {
              reject(error);
              return;
            }

            var timeout = C.synchronization_timeout || 240000;
            var start = new Date().getTime();

            var make_attempt = function() {
              C.web3.eth.getTransactionReceipt(tx, function(err, receipt) {
                if (err) return reject(err);

                if (receipt != null) {
                  // If they've opted into next gen, return more information.
                  if (C.next_gen == true) {
                    return accept({
                      tx: tx,
                      receipt: receipt,
                      logs: decodeLogs(receipt.logs)
                    });
                  } else {
                    return accept(tx);
                  }
                }

                if (timeout > 0 && new Date().getTime() - start > timeout) {
                  return reject(new Error("Transaction " + tx + " wasn't processed in " + (timeout / 1000) + " seconds!"));
                }

                setTimeout(make_attempt, 1000);
              });
            };

            make_attempt();
          };

          args.push(tx_params, callback);
          fn.apply(self, args);
        });
      };
    }
  };

  function instantiate(instance, contract) {
    instance.contract = contract;
    var constructor = instance.constructor;

    // Provision our functions.
    for (var i = 0; i < instance.abi.length; i++) {
      var item = instance.abi[i];
      if (item.type == "function") {
        if (item.constant == true) {
          instance[item.name] = Utils.promisifyFunction(contract[item.name], constructor);
        } else {
          instance[item.name] = Utils.synchronizeFunction(contract[item.name], instance, constructor);
        }

        instance[item.name].call = Utils.promisifyFunction(contract[item.name].call, constructor);
        instance[item.name].sendTransaction = Utils.promisifyFunction(contract[item.name].sendTransaction, constructor);
        instance[item.name].request = contract[item.name].request;
        instance[item.name].estimateGas = Utils.promisifyFunction(contract[item.name].estimateGas, constructor);
      }

      if (item.type == "event") {
        instance[item.name] = contract[item.name];
      }
    }

    instance.allEvents = contract.allEvents;
    instance.address = contract.address;
    instance.transactionHash = contract.transactionHash;
  };

  // Use inheritance to create a clone of this contract,
  // and copy over contract's static functions.
  function mutate(fn) {
    var temp = function Clone() { return fn.apply(this, arguments); };

    Object.keys(fn).forEach(function(key) {
      temp[key] = fn[key];
    });

    temp.prototype = Object.create(fn.prototype);
    bootstrap(temp);
    return temp;
  };

  function bootstrap(fn) {
    fn.web3 = new Web3();
    fn.class_defaults  = fn.prototype.defaults || {};

    // Set the network iniitally to make default data available and re-use code.
    // Then remove the saved network id so the network will be auto-detected on first use.
    fn.setNetwork("default");
    fn.network_id = null;
    return fn;
  };

  // Accepts a contract object created with web3.eth.contract.
  // Optionally, if called without `new`, accepts a network_id and will
  // create a new version of the contract abstraction with that network_id set.
  function Contract() {
    if (this instanceof Contract) {
      instantiate(this, arguments[0]);
    } else {
      var C = mutate(Contract);
      var network_id = arguments.length > 0 ? arguments[0] : "default";
      C.setNetwork(network_id);
      return C;
    }
  };

  Contract.currentProvider = null;

  Contract.setProvider = function(provider) {
    var wrapped = new Provider(provider);
    this.web3.setProvider(wrapped);
    this.currentProvider = provider;
  };

  Contract.new = function() {
    if (this.currentProvider == null) {
      throw new Error("FundingHub error: Please call setProvider() first before calling new().");
    }

    var args = Array.prototype.slice.call(arguments);

    if (!this.unlinked_binary) {
      throw new Error("FundingHub error: contract binary not set. Can't deploy new instance.");
    }

    var regex = /__[^_]+_+/g;
    var unlinked_libraries = this.binary.match(regex);

    if (unlinked_libraries != null) {
      unlinked_libraries = unlinked_libraries.map(function(name) {
        // Remove underscores
        return name.replace(/_/g, "");
      }).sort().filter(function(name, index, arr) {
        // Remove duplicates
        if (index + 1 >= arr.length) {
          return true;
        }

        return name != arr[index + 1];
      }).join(", ");

      throw new Error("FundingHub contains unresolved libraries. You must deploy and link the following libraries before you can deploy a new version of FundingHub: " + unlinked_libraries);
    }

    var self = this;

    return new Promise(function(accept, reject) {
      var contract_class = self.web3.eth.contract(self.abi);
      var tx_params = {};
      var last_arg = args[args.length - 1];

      // It's only tx_params if it's an object and not a BigNumber.
      if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
        tx_params = args.pop();
      }

      tx_params = Utils.merge(self.class_defaults, tx_params);

      if (tx_params.data == null) {
        tx_params.data = self.binary;
      }

      // web3 0.9.0 and above calls new twice this callback twice.
      // Why, I have no idea...
      var intermediary = function(err, web3_instance) {
        if (err != null) {
          reject(err);
          return;
        }

        if (err == null && web3_instance != null && web3_instance.address != null) {
          accept(new self(web3_instance));
        }
      };

      args.push(tx_params, intermediary);
      contract_class.new.apply(contract_class, args);
    });
  };

  Contract.at = function(address) {
    if (address == null || typeof address != "string" || address.length != 42) {
      throw new Error("Invalid address passed to FundingHub.at(): " + address);
    }

    var contract_class = this.web3.eth.contract(this.abi);
    var contract = contract_class.at(address);

    return new this(contract);
  };

  Contract.deployed = function() {
    if (!this.address) {
      throw new Error("Cannot find deployed address: FundingHub not deployed or address not set.");
    }

    return this.at(this.address);
  };

  Contract.defaults = function(class_defaults) {
    if (this.class_defaults == null) {
      this.class_defaults = {};
    }

    if (class_defaults == null) {
      class_defaults = {};
    }

    var self = this;
    Object.keys(class_defaults).forEach(function(key) {
      var value = class_defaults[key];
      self.class_defaults[key] = value;
    });

    return this.class_defaults;
  };

  Contract.extend = function() {
    var args = Array.prototype.slice.call(arguments);

    for (var i = 0; i < arguments.length; i++) {
      var object = arguments[i];
      var keys = Object.keys(object);
      for (var j = 0; j < keys.length; j++) {
        var key = keys[j];
        var value = object[key];
        this.prototype[key] = value;
      }
    }
  };

  Contract.all_networks = {
  "default": {
    "abi": [
      {
        "constant": true,
        "inputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "name": "projectIds",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "name": "projects",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "projectAddress",
            "type": "address"
          },
          {
            "name": "ammount",
            "type": "uint256"
          }
        ],
        "name": "contribute",
        "outputs": [],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "ammount",
            "type": "uint256"
          },
          {
            "name": "deadline",
            "type": "uint256"
          },
          {
            "name": "title",
            "type": "string"
          },
          {
            "name": "description",
            "type": "string"
          }
        ],
        "name": "createProject",
        "outputs": [],
        "payable": false,
        "type": "function"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "ammount",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "deadline",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "title",
            "type": "string"
          },
          {
            "indexed": false,
            "name": "description",
            "type": "string"
          },
          {
            "indexed": false,
            "name": "projectAddress",
            "type": "address"
          }
        ],
        "name": "OnCreateProject",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "projectAddress",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "ammount",
            "type": "uint256"
          }
        ],
        "name": "OnContribute",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [],
        "name": "OnContributeFail",
        "type": "event"
      }
    ],
    "unlinked_binary": "0x60606040526108a1806100126000396000f3606060405260e060020a600035046348c35ad4811461003f578063840e78fd1461008a5780638418cd99146100b0578063b4aeabbe146100cb575b610002565b34610002576103a860043560018054829081101561000257506000527fb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf60154600160a060020a031681565b34610002576103a8600435600060208190529081526040902054600160a060020a031681565b34610002576103c5600435602435600081116103c757610002565b3461000257604080516020600460443581810135601f81018490048402850184019095528484526103c5948235946024803595606494929391909201918190840183828082843750506040805160209735808a0135601f81018a90048a0283018a0190935282825296989760849791965060249190910194509092508291508401838280828437509496505050505050506000600085858585604051610428806104798339018085815260200184815260200180602001806020018381038352858181518152602001915080519060200190808383829060006004602084601f0104600302600f01f150905090810190601f1680156101de5780820380516001836020036101000a031916815260200191505b508381038252848181518152602001915080519060200190808383829060006004602084601f0104600302600f01f150905090810190601f1680156102375780820380516001836020036101000a031916815260200191505b509650505050505050604051809103906000f08015610002579150819050816000600050600083600160a060020a0316815260200190815260200160002060006101000a815481600160a060020a03021916908302179055507f32f6c642a58ce25df658a4dba6068288af645b9a0d1dcede6047de6b743ee0be868686868560405180868152602001858152602001806020018060200184600160a060020a031681526020018381038352868181518152602001915080519060200190808383829060006004602084601f0104600302600f01f150905090810190601f1680156103355780820380516001836020036101000a031916815260200191505b508381038252858181518152602001915080519060200190808383829060006004602084601f0104600302600f01f150905090810190601f16801561038e5780820380516001836020036101000a031916815260200191505b5097505050505050505060405180910390a1505050505050565b60408051600160a060020a03929092168252519081900360200190f35b005b600160a060020a0382811660009081526020819052604080822054905192169183156108fc0291849190818181858888f193505050501561044b5760408051600160a060020a03841681526020810183905281517fab4b60a3c46d42f174e7a64622a843a8d5e4f612d0662790a9c9e1f015370770929181900390910190a1610475565b6040517f59dd4681ef9e053068ab9a89287e52137da9abb6bf09a8f3f41b2d18a3caf53c90600090a15b505056606060405260405161042838038061042883398101604052805160805160a05160c05192939192908201910160028054600160a060020a0319163217815560038590556004849055600580548451600083905291926020601f600184161561010002600019019093169190910482018190047f036b6384b5eca791c62761152d0c79bb0604c104a5fb6f4eb0703f3154bb3db0908101939290918701908390106100cc57805160ff19168380011785555b506100fc9291505b8082111561015b57600081556001016100b8565b828001600101855582156100b0579182015b828111156100b05782518260005055916020019190600101906100de565b50508060026000506004016000509080519060200190828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061015f57805160ff19168380011785555b5061018f9291506100b8565b5090565b8280016001018555821561014f579182015b8281111561014f578251826000505591602001919060010190610171565b5050600060078190556008805460ff191660011761ff0019169055604051600160a060020a03329081166c0100000000000000000000000002825242601483018190526034830188905260548301879052855191939092889288928892889290916074830191602086810192829185918391869190600490601f850104600302600f01f1509050018280519060200190808383829060006004602084601f0104600302600f01f15090500196505050505050506040518091039020600260005060070160005081905550505050506101bd8061026b6000396000f36060604052361561000b575b61002360085460ff1615156000141561002557610002565b005b600454421115610104576008805460ff191690819055610100900460ff161515600014156101b2576101b2600154600080805b8383116101b457600180548490811015610002576000918252602080832090910154600160a060020a03168083529082905260408083205490519194509250839183156108fc02918491818181858888f19350505050156100f85760408051600160a060020a03841681526020810183905281517f8f6344cd78d5b5be2a4ab056ca029e539ddebf7136987c97b34b8d988675a5f1929181900390910190a15b60019290920191610058565b6101b23432600160a060020a031660009081526020819052604090208054820190556007805482019081905560035490106101ba576101ba6008805461ffff1916610100179055600254600754604051600160a060020a03929092169181156108fc0291906000818181858888f19350505050156101b25760075460408051918252517f103b052c278310f4ba1ccdaeaaa8843bd7db53ce7ac5be697c4d3235125613da9181900360200190a15b565b50505050565b5056",
    "events": {
      "0x32f6c642a58ce25df658a4dba6068288af645b9a0d1dcede6047de6b743ee0be": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "ammount",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "deadline",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "title",
            "type": "string"
          },
          {
            "indexed": false,
            "name": "description",
            "type": "string"
          },
          {
            "indexed": false,
            "name": "projectAddress",
            "type": "address"
          }
        ],
        "name": "OnCreateProject",
        "type": "event"
      },
      "0xab4b60a3c46d42f174e7a64622a843a8d5e4f612d0662790a9c9e1f015370770": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "projectAddress",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "ammount",
            "type": "uint256"
          }
        ],
        "name": "OnContribute",
        "type": "event"
      },
      "0x59dd4681ef9e053068ab9a89287e52137da9abb6bf09a8f3f41b2d18a3caf53c": {
        "anonymous": false,
        "inputs": [],
        "name": "OnContributeFail",
        "type": "event"
      }
    },
    "updated_at": 1486292647384,
    "links": {},
    "address": "0xd8552332832d7234f26db6a79b451c361844de72"
  }
};

  Contract.checkNetwork = function(callback) {
    var self = this;

    if (this.network_id != null) {
      return callback();
    }

    this.web3.version.network(function(err, result) {
      if (err) return callback(err);

      var network_id = result.toString();

      // If we have the main network,
      if (network_id == "1") {
        var possible_ids = ["1", "live", "default"];

        for (var i = 0; i < possible_ids.length; i++) {
          var id = possible_ids[i];
          if (Contract.all_networks[id] != null) {
            network_id = id;
            break;
          }
        }
      }

      if (self.all_networks[network_id] == null) {
        return callback(new Error(self.name + " error: Can't find artifacts for network id '" + network_id + "'"));
      }

      self.setNetwork(network_id);
      callback();
    })
  };

  Contract.setNetwork = function(network_id) {
    var network = this.all_networks[network_id] || {};

    this.abi             = this.prototype.abi             = network.abi;
    this.unlinked_binary = this.prototype.unlinked_binary = network.unlinked_binary;
    this.address         = this.prototype.address         = network.address;
    this.updated_at      = this.prototype.updated_at      = network.updated_at;
    this.links           = this.prototype.links           = network.links || {};
    this.events          = this.prototype.events          = network.events || {};

    this.network_id = network_id;
  };

  Contract.networks = function() {
    return Object.keys(this.all_networks);
  };

  Contract.link = function(name, address) {
    if (typeof name == "function") {
      var contract = name;

      if (contract.address == null) {
        throw new Error("Cannot link contract without an address.");
      }

      Contract.link(contract.contract_name, contract.address);

      // Merge events so this contract knows about library's events
      Object.keys(contract.events).forEach(function(topic) {
        Contract.events[topic] = contract.events[topic];
      });

      return;
    }

    if (typeof name == "object") {
      var obj = name;
      Object.keys(obj).forEach(function(name) {
        var a = obj[name];
        Contract.link(name, a);
      });
      return;
    }

    Contract.links[name] = address;
  };

  Contract.contract_name   = Contract.prototype.contract_name   = "FundingHub";
  Contract.generated_with  = Contract.prototype.generated_with  = "3.2.0";

  // Allow people to opt-in to breaking changes now.
  Contract.next_gen = false;

  var properties = {
    binary: function() {
      var binary = Contract.unlinked_binary;

      Object.keys(Contract.links).forEach(function(library_name) {
        var library_address = Contract.links[library_name];
        var regex = new RegExp("__" + library_name + "_*", "g");

        binary = binary.replace(regex, library_address.replace("0x", ""));
      });

      return binary;
    }
  };

  Object.keys(properties).forEach(function(key) {
    var getter = properties[key];

    var definition = {};
    definition.enumerable = true;
    definition.configurable = false;
    definition.get = getter;

    Object.defineProperty(Contract, key, definition);
    Object.defineProperty(Contract.prototype, key, definition);
  });

  bootstrap(Contract);

  if (typeof module != "undefined" && typeof module.exports != "undefined") {
    module.exports = Contract;
  } else {
    // There will only be one version of this contract in the browser,
    // and we can use that.
    window.FundingHub = Contract;
  }
})();
