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
    projectData.deadline = deadline;
    projectData.title = title;
    projectData.description = description;
    projectData.ammountRaised = 0;
    projectData.active = true;
    projectData.successfull = false;

    bIsPayingOut = false;
    bIsRefunding = false;
  }

  function fund(uint256 ammount) returns (bool success) {
    if (projectData.active == false) return false;
    if (now > projectData.deadline) {
      projectData.active = false;
      if (projectData.successfull == false) return refund();
    } else {
      if (tx.origin.send(ammount)) {
        contributors[tx.origin] += ammount;
        projectData.ammountRaised += ammount;

        if (projectData.ammountRaised >= projectData.ammount) {
          return payout();
        }

        return true;
      }
    }

    return false;
  }

  function payout() returns (bool success) {
    if (bIsPayingOut == false) {
      bIsPayingOut = true;
      projectData.active = false;
      projectData.successfull = true;

      if (projectData.owner.send(projectData.ammountRaised)) {
        OnPayout(projectData.ammountRaised);
        return true;
      } else {
        // To notify a fail in payout
        bIsPayingOut = false;
      }
    }

    return false;
  }

  function refund() returns (bool success) {
    if (bIsRefunding == false) {
      bIsRefunding = true;
      uint iCount = contributorsIds.length;
      for (uint i=0;i<=iCount;i++) {
        address addressToRefund = contributorsIds[i];
        uint256 ammount = contributors[addressToRefund];
        if (addressToRefund.send(ammount)) {
          OnRefund(addressToRefund,ammount);
          return true;
        } else {
          // To notify a fail in a refund
          bIsRefunding = false;
        }
      }
    }

    return false;
  }

  function() {
    throw;
  }
}
