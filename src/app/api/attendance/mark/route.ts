import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db';
import Student from '../../../../models/Student';
import Attendance from '../../../../models/Attendance';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { studentId } = body;

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    await dbConnect();

    const student = await Student.findOne({ studentId });

    if (!student) {
      return NextResponse.json({ error: 'Invalid Student ID' }, { status: 404 });
    }

    if (!student.isActive) {
      return NextResponse.json({ error: 'Student account is inactive. Access denied.' }, { status: 403 });
    }

    if (student.paymentStatus === 'Pending') {
      return NextResponse.json({ error: 'Fee payment is pending. Access denied.' }, { status: 403 });
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

    if (!record) {
      // Check-in
      await Attendance.create({
        studentId,
        date: startOfDay,
        checkInTime: now
      });
      return NextResponse.json({ message: 'Check-in successful. Have a great day!' });
    }

    // Since we only want check-ins, if they scan again just return success
    // so they see the green checkmark and session expired screen.
    return NextResponse.json({ message: 'Attendance already marked for today. Have a great day!' });

  } catch (error: any) {
    console.error('[Attendance Mark API Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
