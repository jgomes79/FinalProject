contract('FundingHub', function(accounts) {
  it("Should refund a project", function() {
    var fundingHub = FundingHub.deployed();

    fundingHub.createProject(1000,100,"Test Project","Test Project Description", {from:accounts[0]}).then(function() {
      var p = fundingHub.OnCreateProject();
      var projectAddress = p.options.address;
      var project = Project.at(projectAddress);
      if (project) {
        console.log("OnProjectCreated");

        fundingHub.contribute(projectAddress,10, {from:accounts[0]}).then(function() {
          console.log("OnContribute and now refund");
          project.refund().then(function() {
            console.log("Project refounded");
          });
        });
      } else {
        console.log("Error creating project");
      }
    });
  });
});
