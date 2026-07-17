import { NextResponse } from 'next/server';
import dbConnect from '../../../../../lib/db';
import Student from '../../../../../models/Student';
import Attendance from '../../../../../models/Attendance';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    await dbConnect();
    const resolvedParams = await params;
    const studentId = resolvedParams.studentId;

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    const student = await Student.findOne({ studentId });

    if (!student) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 404 });
    }

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const record = await Attendance.findOne({
      studentId,
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    return NextResponse.json({ 
      name: student.name,
      alreadyMarked: !!record 
    });
  } catch (error: any) {
    console.error('[Verify API Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
