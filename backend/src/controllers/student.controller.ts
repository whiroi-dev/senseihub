import { Request, Response } from 'express';
import prisma from '../config/prisma';

export const listStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    const students = await prisma.student.findMany({
      include: { certificates: true }
    });
    res.json(students);
  } catch (error) {
    console.error('[studentController.listStudents] Error:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
};

export const createStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, rank } = req.body;
    if (!name || !rank) {
      res.status(400).json({ error: 'name and rank are required' });
      return;
    }
    const student = await prisma.student.create({
      data: { name, rank }
    });
    res.status(201).json(student);
  } catch (error) {
    console.error('[studentController.createStudent] Error:', error);
    res.status(500).json({ error: 'Failed to create student' });
  }
};
