import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { StudentsService } from './student.service';
import { CreateStudentDto, UpdateStudentDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../shared/enums/role.enum';
import { Request } from 'express';

// Type pour la requête authentifiée
interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    role: Role;
    tenantId: string;
  };
}

/**
 * Controller pour la gestion des élèves
 *
 * Toutes les routes sont protégées par JWT et vérification des rôles
 * Accès : ADMIN et SECRETARY uniquement
 */
@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SECRETARY)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  /**
   * Créer un nouvel élève
   * POST /students
   */
  @Post()
  async create(
    @Body() createStudentDto: CreateStudentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.studentsService.create(createStudentDto, req.user.tenantId);
  }

  /**
   * Récupérer tous les élèves
   * GET /students?includeArchived=true
   */
  @Get()
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Query('includeArchived') includeArchived?: string,
  ) {
    const includeArchivedBool = includeArchived === 'true';
    return this.studentsService.findAll(req.user.tenantId, includeArchivedBool);
  }

  /**
   * Récupérer un élève par ID
   * GET /students/:id
   */
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.studentsService.findOne(id, req.user.tenantId);
  }

  /**
   * Mettre à jour un élève
   * PUT /students/:id
   */
  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStudentDto: UpdateStudentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.studentsService.update(id, updateStudentDto, req.user.tenantId);
  }

  /**
   * Archiver un élève (soft delete)
   * POST /students/:id/archive
   */
  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  async archive(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.studentsService.archive(id, req.user.tenantId, req.user.userId);
  }

  /**
   * Restaurer un élève archivé
   * POST /students/:id/restore
   */
  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  async restore(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.studentsService.restore(id, req.user.tenantId, req.user.userId);
  }

  /**
   * Supprimer définitivement un élève (hard delete)
   * DELETE /students/:id
   */
  @Delete(':id')
  @Roles(Role.ADMIN) // Suppression définitive = Admin seulement
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.studentsService.remove(id, req.user.tenantId);
  }

  // ========== GESTION DES HEURES ==========

  /**
   * Récupérer les heures restantes
   * GET /students/:id/hours
   */
  @Get(':id/hours')
  async getHours(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const remainingMinutes = await this.studentsService.getRemainingMinutes(
      id,
      req.user.tenantId,
    );
    const student = await this.studentsService.findOne(id, req.user.tenantId);

    return {
      minutesPurchased: student.minutesPurchased,
      minutesUsed: student.minutesUsed,
      minutesRemaining: remainingMinutes,
      // Conversion en heures pour l'affichage
      hoursPurchased: Math.floor(student.minutesPurchased / 60),
      hoursUsed: Math.floor(student.minutesUsed / 60),
      hoursRemaining: Math.floor(remainingMinutes / 60),
    };
  }

  /**
   * Ajouter des heures achetées
   * POST /students/:id/hours/purchase
   */
  @Post(':id/hours/purchase')
  @HttpCode(HttpStatus.OK)
  async addPurchasedHours(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('minutes') minutes: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.studentsService.addPurchasedMinutes(
      id,
      minutes,
      req.user.tenantId,
      req.user.userId,
    );
  }

  /**
   * Enregistrer des heures consommées
   * POST /students/:id/hours/use
   */
  @Post(':id/hours/use')
  @HttpCode(HttpStatus.OK)
  async addUsedHours(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('minutes') minutes: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.studentsService.addUsedMinutes(
      id,
      minutes,
      req.user.tenantId,
      req.user.userId,
    );
  }
}
