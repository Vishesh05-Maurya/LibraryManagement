'use server';

import { revalidatePath } from 'next/cache';
import dbConnect from '../lib/db';
import Student from '../models/Student';
import Seat from '../models/Seat';

// Helper to check admin authorization (bypassed)
async function checkAdminAuth() {
  return null;
}

// 1. Fetch dashboard data (seats, overdue list, metrics)
export async function getDashboardData() {
  try {
    await checkAdminAuth();
    await dbConnect();

    // Fetch and populate seats
    const seats = await Seat.find()
      .sort({ seatNumber: 1 })
      .populate({
        path: 'currentStudentId',
        model: Student,
      });

    // Ensure data integrity: Deactivate any student who is marked active but holds no seat
    const occupiedSeats = await Seat.find({ status: 'Occupied' }, 'currentStudentId');
    const occupiedStudentIds = occupiedSeats.map(s => s.currentStudentId).filter(Boolean);
    await Student.updateMany(
      { _id: { $nin: occupiedStudentIds }, isActive: true },
      { $set: { isActive: false } }
    );

    // Fetch due or overdue active students
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const dueOrOverdueStudents = await Student.find({
      isActive: true,
      $or: [
        { renewalDate: { $lte: threeDaysFromNow } },
        { paymentStatus: 'Pending' }
      ]
    }).sort({ renewalDate: 1, name: 1 });

    // Calculate metrics
    const totalActive = await Student.countDocuments({ isActive: true });
    const totalOccupied = await Seat.countDocuments({ status: 'Occupied' });
    const totalAvailable = await Seat.countDocuments({ status: 'Available' });
    const totalMaintenance = await Seat.countDocuments({ status: 'Maintenance' });
    
    // Revenue collection this month (active paid members, summed by shift pricing)
    const paidStudents = await Student.find({ isActive: true, paymentStatus: 'Paid' }, 'price');
    const monthlyRevenue = paidStudents.reduce((sum, s) => sum + (s.price || 0), 0);

    // Serialize MongoDB objects for client safe usage
    return {
      success: true,
      seats: JSON.parse(JSON.stringify(seats)),
      dueOrOverdueStudents: JSON.parse(JSON.stringify(dueOrOverdueStudents)),
      metrics: {
        totalActive,
        totalOccupied,
        totalAvailable,
        totalMaintenance,
        monthlyRevenue
      }
    };
  } catch (error: any) {
    console.error('[crmActions:getDashboardData] Error:', error);
    return { success: false, error: error.message || 'Failed to fetch dashboard data' };
  }
}

// 2. Allot Seat
interface AllotSeatInput {
  name: string;
  contactNumber: string;
  seatNumber: number;
  joinDate: string;
  paymentStatus: 'Paid' | 'Pending';
  paymentMethod: 'Cash' | 'UPI' | 'Bank Transfer';
  shift: 'Day' | 'Night' | 'Day & Night';
}

export async function allotSeat(data: AllotSeatInput) {
  try {
    await checkAdminAuth();
    await dbConnect();

    const { name, contactNumber, seatNumber, joinDate, paymentStatus, paymentMethod, shift } = data;

    // Validate contact number format
    if (!/^\d{10}$/.test(contactNumber)) {
      throw new Error('Contact number must be exactly 10 digits and contain only numbers.');
    }

    // Check if the seat is available
    const seat = await Seat.findOne({ seatNumber });
    if (!seat) {
      throw new Error(`Seat ${seatNumber} not found`);
    }
    if (seat.status !== 'Available') {
      throw new Error(`Seat ${seatNumber} is not available (Status: ${seat.status})`);
    }

    // Create Student record
    const parsedJoinDate = new Date(joinDate);
    const renewalDate = new Date(parsedJoinDate);
    renewalDate.setDate(renewalDate.getDate() + 30);

    // Calculate price based on selected shift
    const price = shift === 'Day & Night' ? 900 : 500;

    const student = new Student({
      name,
      contactNumber,
      seatNumber,
      joinDate: parsedJoinDate,
      renewalDate,
      paymentStatus,
      paymentMethod,
      shift,
      price,
      isActive: true
    });

    const savedStudent = await student.save();

    // Update Seat record
    seat.status = 'Occupied';
    seat.currentStudentId = savedStudent._id;
    await seat.save();

    revalidatePath('/');
    return { success: true, studentId: savedStudent._id.toString() };
  } catch (error: any) {
    console.error('[crmActions:allotSeat] Error:', error);
    return { success: false, error: error.message || 'Failed to allot seat' };
  }
}

// 3. Renew Subscription
export async function renewSubscription(studentId: string) {
  try {
    await checkAdminAuth();
    await dbConnect();

    const student = await Student.findById(studentId);
    if (!student) {
      throw new Error('Student record not found');
    }

    // Always extend 30 days from the student's existing renewal date to maintain the billing cycle
    const existingRenewal = new Date(student.renewalDate);
    const newRenewalDate = new Date(existingRenewal);
    newRenewalDate.setDate(newRenewalDate.getDate() + 30);

    student.renewalDate = newRenewalDate;
    student.paymentStatus = 'Paid';
    await student.save();

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('[crmActions:renewSubscription] Error:', error);
    return { success: false, error: error.message || 'Failed to renew subscription' };
  }
}

export async function vacateSeat(seatNumber: number, studentId?: string) {
  try {
    await checkAdminAuth();
    await dbConnect();

    // Reset Seat
    const seat = await Seat.findOne({ seatNumber });
    if (!seat) {
      throw new Error(`Seat ${seatNumber} not found`);
    }

    const resolvedStudentId = studentId || seat.currentStudentId;

    // Mark student as inactive
    if (resolvedStudentId) {
      const student = await Student.findById(resolvedStudentId);
      if (student) {
        student.isActive = false;
        await student.save();
      }
    }

    seat.status = 'Available';
    seat.currentStudentId = null;
    await seat.save();

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('[crmActions:vacateSeat] Error:', error);
    return { success: false, error: error.message || 'Failed to vacate seat' };
  }
}

// 5. Change Seat
export async function changeSeat(studentId: string, oldSeatNumber: number, newSeatNumber: number) {
  try {
    await checkAdminAuth();
    await dbConnect();

    // Validate new seat
    const newSeat = await Seat.findOne({ seatNumber: newSeatNumber });
    if (!newSeat) {
      throw new Error(`Target seat ${newSeatNumber} not found`);
    }
    if (newSeat.status !== 'Available') {
      throw new Error(`Target seat ${newSeatNumber} is not Available (Status: ${newSeat.status})`);
    }

    // Verify student
    const student = await Student.findById(studentId);
    if (!student || !student.isActive) {
      throw new Error('Student not found or is inactive');
    }

    // Update old seat
    const oldSeat = await Seat.findOne({ seatNumber: oldSeatNumber });
    if (oldSeat) {
      oldSeat.status = 'Available';
      oldSeat.currentStudentId = null;
      await oldSeat.save();
    }

    // Update student
    student.seatNumber = newSeatNumber;
    await student.save();

    // Update new seat
    newSeat.status = 'Occupied';
    newSeat.currentStudentId = student._id;
    await newSeat.save();

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('[crmActions:changeSeat] Error:', error);
    return { success: false, error: error.message || 'Failed to change seat' };
  }
}

// 6. Toggle Maintenance status
export async function toggleMaintenance(seatNumber: number, currentStatus: 'Available' | 'Maintenance') {
  try {
    await checkAdminAuth();
    await dbConnect();

    const seat = await Seat.findOne({ seatNumber });
    if (!seat) {
      throw new Error(`Seat ${seatNumber} not found`);
    }

    if (seat.status === 'Occupied') {
      throw new Error('Cannot toggle maintenance on an occupied seat. Vacate first.');
    }

    const nextStatus = currentStatus === 'Available' ? 'Maintenance' : 'Available';
    seat.status = nextStatus;
    await seat.save();

    revalidatePath('/');
    return { success: true, nextStatus };
  } catch (error: any) {
    console.error('[crmActions:toggleMaintenance] Error:', error);
    return { success: false, error: error.message || 'Failed to toggle seat maintenance' };
  }
}
