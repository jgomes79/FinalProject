module.exports = function(deployer) {

  deployer.deploy(Project)
   	.then(function() {
       return deployer.deploy(FundingHub);
   	});
};
