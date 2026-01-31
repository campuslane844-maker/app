import mongoose from "mongoose";

export type ContentType = 'file' | 'video' | 'quiz' | 'game' | 'image';
export type UserRole = 'student' | 'teacher' | 'parent' | 'admin';
export type QuizType = 'googleForm' | 'native';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export interface Progress {
  status: 'in_progress' | 'completed' | 'not_started';
  completed: boolean;
  lastWatchedSeconds?: number;
  progressPercent?: number;
};

export interface Question {
  questionText: string;
  s3Key?: string;
  options: string[];       
  correctOption: number;  
}
export interface User {
  _id: mongoose.Schema.Types.ObjectId | string;
  studentCode?: string;
  name: string;
  email: string;
  age?: number;
  classLevel?: mongoose.Types.ObjectId;
  classOther?: string;
  role: 'student' | 'parent' | 'teacher';
  pinCode: string;
  city: string;
  state: string;
  country: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
}

export interface Content {
  _id: string;
  title: string;
  description?: string;
  paid?: boolean;
  classId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  chapterId: mongoose.Types.ObjectId;
  type: ContentType;
  duration?: number;          
  fileSize?: number;    
  s3Key?: string;
  thumbnailKey?: string;
  quizType?: QuizType;
  googleFormUrl?: string;
  questions?: Question[];  
  uploaderId: mongoose.Types.ObjectId;
  uploaderRole: UserRole;
  isAdminContent: boolean;
  approvalStatus: ApprovalStatus;
  feedback: string;
  progress: Progress;
  tags: string[];
  uniqueViews: number;
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  __v?: number;
}