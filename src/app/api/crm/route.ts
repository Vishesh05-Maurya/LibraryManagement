import { NextResponse } from 'next/server';
import { 
  getDashboardData, 
  allotSeat, 
  renewSubscription, 
  vacateSeat, 
  changeSeat, 
  toggleMaintenance 
} from '../../../actions/crmActions';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, PATCH, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

export async function GET() {
  try {
    const res = await getDashboardData();
    return NextResponse.json(res, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch dashboard data' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, data } = body;

    let res;
    switch (action) {
      case 'allot':
        res = await allotSeat(data);
        break;
      case 'renew':
        res = await renewSubscription(data.studentId);
        break;
      case 'vacate':
        res = await vacateSeat(data.seatNumber);
        break;
      case 'change':
        res = await changeSeat(data.studentId, data.newSeatNumber);
        break;
      case 'toggleMaintenance':
        res = await toggleMaintenance(data.seatNumber, data.currentStatus);
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action parameter' },
          { status: 400, headers: corsHeaders }
        );
    }

    return NextResponse.json(res, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
