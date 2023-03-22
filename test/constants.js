module.exports = {
  // random numbers below just for the right type
  DONT_CARE_ADDRESS: "0x072c7F4a8e9276f810727Ca68d3c99e6d8a72990",
  DONT_CARE_BOOL: false,
  DONT_CARE_NUM: 123,
  DONT_CARE_FUNC_SELECTOR: "0x12341234", //4 bytes
  DONT_CARE_OPERATOR: 1,
  DONT_CARE_ABR_BYTES: ["0x012345", "0x6789abcdef"],
  DONT_CARE_DATA: "0xabcdef",

  // define operator type
  AND: 0,
  OR: 1,

  // define quester's status
  INELIGIBLE: 0,
  ELIGIBLE: 1,
  REWARDED: 2,

  // define struct types for mission formula construction
  missionNodeType: ["uint256", "bool", "address", "address", "uint8", "uint256", "uint256", "bytes[]"],
  outcomeTypes: ["address", "bytes4", "bytes", "bool", "uint256", "bool", "uint256"]
};
