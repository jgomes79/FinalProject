contract('FundingHub', function(accounts) {
  it("Should refund a project", function() {
    var fundingHub = FundingHub.deployed();

    fundingHub.createProject(10,1490525726,"Test Project","Test Project Description", {from:accounts[0]}).then(function() {
      var p = fundingHub.OnCreateProject();
      var projectAddress = p.options.address;
      var project = Project.at(projectAddress);
      if (project) {
        fundingHub.contribute(projectAddress,10, {from:accounts[0]}).then(function() {
          project.refund().then(function() {
            console.log("Everything ok...");
          });
        });
      } else {
        console.log("Error creating project");
      }
    });
  });
});
