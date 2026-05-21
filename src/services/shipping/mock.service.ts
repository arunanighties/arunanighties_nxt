/**
 * Mock Shipping Service
 * Simulates Xpressbees tracking responses for local development.
 */

// In-memory state for mock AWB stages
// Maps AWB number to stage index (0-4)
const awbStages = new Map<string, number>();

const TIMELINE_STAGES = [
  {
    status: "Picked Up",
    ship_status: "pending pickup",
    message: "Shipment picked up from seller",
    location: "Bangalore Hub",
    delay: 172800 // 2 days ago
  },
  {
    status: "In Transit",
    ship_status: "in transit",
    message: "Shipment departed from hub",
    location: "Bangalore Hub",
    delay: 86400 // 1 day ago
  },
  {
    status: "In Transit",
    ship_status: "in transit",
    message: "Shipment arrived at gateway",
    location: "Mumbai Gateway",
    delay: 18000 // 5 hours ago
  },
  {
    status: "Out for Delivery",
    ship_status: "out for delivery",
    message: "Shipment is out for delivery",
    location: "Mumbai Hub",
    delay: 3600 // 1 hour ago
  },
  {
    status: "Delivered",
    ship_status: "delivered",
    message: "Shipment delivered successfully",
    location: "Mumbai",
    delay: 0 // Now
  }
];

export const getMockToken = async (): Promise<string> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return "mock_token_12345";
};

export const advanceMockStage = (awbNumber: string) => {
  const current = awbStages.get(awbNumber) ?? 0;
  if (current < TIMELINE_STAGES.length - 1) {
    awbStages.set(awbNumber, current + 1);
    return true;
  }
  return false;
};

export const rewindMockStage = (awbNumber: string) => {
  const current = awbStages.get(awbNumber) ?? 0;
  if (current > 0) {
    awbStages.set(awbNumber, current - 1);
    return true;
  }
  return false;
};

export const trackShipmentMock = async (awbNumber: string) => {
  await new Promise((resolve) => setTimeout(resolve, 800));

  const currentStageIdx = awbStages.get(awbNumber) ?? 0;
  const now = Math.floor(Date.now() / 1000);

  // Filter stages up to current index
  const activeStages = TIMELINE_STAGES.slice(0, currentStageIdx + 1);

  const tracking_data: any = {
    "delivered": [],
    "out for delivery": [],
    "in transit": [],
    "pending pickup": []
  };

  activeStages.forEach((stage, idx) => {
    const event = {
      id: String(idx + 1),
      awb_number: awbNumber,
      event_time: String(now - stage.delay),
      location: stage.location,
      message: stage.message,
      status: stage.status,
      ship_status: stage.ship_status
    };
    
    if (tracking_data[stage.ship_status]) {
      tracking_data[stage.ship_status].push(event);
    }
  });

  // Ensure "pending pickup" always has at least one event (Stage 0 requirement)
  if (tracking_data["pending pickup"].length === 0) {
    tracking_data["pending pickup"].push({
      ship_status: "pending pickup",
      status_code: "DRC",
      message: "Pending",
      event_time: String(now),
      location: "Source Warehouse"
    });
  }

  return {
    response: true,
    tracking_data
  };
};

// In-memory list of mock NDR exceptions
let mockNDRs = [
  {
    awb_number: "8459632115",
    event_date: new Date(Date.now() - 3600000 * 2).toISOString(),
    courier_remarks: "Customer refused to accept - requested delivery on weekend",
    total_attempts: 1
  },
  {
    awb_number: "8459632116",
    event_date: new Date(Date.now() - 3600000 * 24).toISOString(),
    courier_remarks: "Address incomplete, contact number not reachable",
    total_attempts: 2
  },
  {
    awb_number: "8459632117",
    event_date: new Date(Date.now() - 3600000 * 48).toISOString(),
    courier_remarks: "Door locked / premises closed",
    total_attempts: 1
  }
];

export const getMockNDRList = async () => {
  await new Promise((resolve) => setTimeout(resolve, 800));
  if (mockNDRs.length === 0) {
    // Re-initialize for testing convenience if list becomes empty
    mockNDRs = [
      {
        awb_number: "8459632115",
        event_date: new Date(Date.now() - 3600000 * 2).toISOString(),
        courier_remarks: "Customer refused to accept - requested delivery on weekend",
        total_attempts: 1
      },
      {
        awb_number: "8459632116",
        event_date: new Date(Date.now() - 3600000 * 24).toISOString(),
        courier_remarks: "Address incomplete, contact number not reachable",
        total_attempts: 2
      },
      {
        awb_number: "8459632117",
        event_date: new Date(Date.now() - 3600000 * 48).toISOString(),
        courier_remarks: "Door locked / premises closed",
        total_attempts: 1
      }
    ];
  }
  return mockNDRs;
};

export const createMockNDR = async (payload: { awb: string; action: string; action_data: any }) => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const { awb, action, action_data } = payload;
  
  // Filter out the resolved NDR from list to simulate resolution
  mockNDRs = mockNDRs.filter(ndr => ndr.awb_number !== awb);
  
  return {
    success: true,
    message: `NDR action '${action}' successfully submitted for AWB ${awb}`,
    data: {
      awb,
      action,
      action_data,
      status: "submitted"
    }
  };
};
