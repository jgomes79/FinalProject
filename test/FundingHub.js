contract('FundingHub', function(accounts) {
  it("Should refund a project", function() {
    var fundingHub = FundingHub.deployed();

    fundingHub.createProject(1000,100,"Test Project","Test Project Description", {from:accounts[0]}).then(function() {
      var p = fundingHub.OnCreateProject();
      var projectAddress = p.options.address;
      var project = Project.at(projectAddress);
      if (project) {
        console.log("OnProjectCreated");
        var balance = accounts[0].balance;
        console.log("Initial balance: " + balance);
        fundingHub.contribute(projectAddress,10, {from:accounts[0]}).then(function() {
          var newBalance = accounts[0].balance;
          console.log("Balance after contribute: " + balance);
          project.refund().then(function() {
            var newNewBalance = accounts[0].balance;
            console.log("Balance after refund: " + newNewBalance);
          });
        });
      } else {
        console.log("Error creating project");
      }
    });
  });
});
