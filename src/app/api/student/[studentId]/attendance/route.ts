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
    const studentDbId = resolvedParams.studentId;

    if (!studentDbId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    const student = await Student.findById(studentDbId);

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const attendanceRecords = await Attendance.find({ studentId: student.studentId })
      .sort({ date: 1 })
      .select('date checkInTime');

    return NextResponse.json({ 
      success: true, 
      joinDate: student.joinDate,
      attendance: attendanceRecords 
    });
  } catch (error: any) {
    console.error('[Attendance Fetch API Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
