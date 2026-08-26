import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { EligibilityService } from '../services/eligibility.service';

const eligibilityService = new EligibilityService();

export class EligibilityController {
  async check(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { dojoId } = req.user!;
      const studentId = req.params.studentId;
      
      const result = await eligibilityService.checkEligibility(studentId, dojoId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}
