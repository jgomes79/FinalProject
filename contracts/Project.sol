pragma solidity ^0.4.2;

contract Project {

  struct ProjectData {
    address owner;
    uint ammount;
    uint deadline;
    string title;
    string description;
    uint ammountRaised;
    bool active;
    bool successfull;
  }

  ProjectData projectData;

  mapping ( address => uint256 ) public contributors;
  address[] public contributorsIds;

  bool bIsPayingOut;
  bool bIsRefunding;

  event OnPayout(uint256 ammount);
	event OnRefund(address toRefund, uint256 ammount);

  function Project(uint ammount, uint deadline, string title, string description) {
    projectData.owner = tx.origin;
    projectData.ammount = ammount;
    projectData.deadline = now + deadline;
    projectData.title = title;
    projectData.description = description;
    projectData.ammountRaised = 0;
    projectData.active = true;
    projectData.successfull = false;

    bIsPayingOut = false;
    bIsRefunding = false;
  }

  function fund(uint256 ammount) {
    contributors[tx.origin] += ammount;
    projectData.ammountRaised += ammount;

    if (projectData.ammountRaised >= projectData.ammount) {
      payout();
    }
  }

  function payout() {
    if (bIsPayingOut == false) {
      bIsPayingOut = true;
      projectData.active = false;
      projectData.successfull = true;

      if (projectData.owner.send(projectData.ammountRaised)) {
        OnPayout(projectData.ammountRaised);
      } else {
        // To notify a fail in payout
        bIsPayingOut = false;
      }
    }
  }

  function refund() {
    if (bIsRefunding == false) {
      bIsRefunding = true;
      uint iCount = contributorsIds.length;
      for (uint i=0;i<=iCount;i++) {
        address addressToRefund = contributorsIds[i];
        uint256 ammount = contributors[addressToRefund];
        if (addressToRefund.send(ammount)) {
          OnRefund(addressToRefund,ammount);
        } else {
          // To notify a fail in a refund
          bIsRefunding = false;
        }
      }
    }
  }

  function() payable {
    if (projectData.active == false) throw;
    if (now > projectData.deadline) {
      projectData.active = false;
      if (projectData.successfull == false) refund();
    } else {
      fund(msg.value);
    }
  }
}
