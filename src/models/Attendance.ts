import mongoose, { Schema, Document, model, models } from 'mongoose';

export interface IAttendance extends Document {
  studentId: string;
  date: Date;
  checkInTime?: Date;
  checkOutTime?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    studentId: { 
      type: String, 
      required: true,
      index: true 
    },
    date: { 
      type: Date, 
      default: Date.now 
    },
    checkInTime: { 
      type: Date 
    },
    checkOutTime: { 
      type: Date 
    }
  },
  { timestamps: true }
);

export default models.Attendance || model<IAttendance>('Attendance', AttendanceSchema);
