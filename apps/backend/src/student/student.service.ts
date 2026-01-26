import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto, UpdateStudentDto } from './dto';
import * as bcrypt from 'bcrypt';
import { UserRole, StudentStatus } from '@prisma/client';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createStudentDto: CreateStudentDto, tenantId: string) {
    // 1. Hash du mot de passe fourni dans le DTO
    const hashedPassword = await bcrypt.hash(createStudentDto.password, 10);

    // 2. DÉBUT DE LA TRANSACTION
    return await this.prisma.$transaction(async (tx) => {
      // A. Vérifier si l'email existe déjà
      const existingUser = await tx.user.findUnique({
        where: { email: createStudentDto.email },
      });
      if (existingUser) {
        throw new ConflictException('Cet email est déjà utilisé.');
      }

      // B. Vérifier si le NEPH existe déjà (si fourni)
      if (createStudentDto.neph) {
        const existingNeph = await tx.student.findUnique({
          where: { neph: createStudentDto.neph },
        });
        if (existingNeph) {
          throw new ConflictException('Ce numéro NEPH est déjà utilisé.');
        }
      }

      // C. Créer l'utilisateur (User)
      const newUser = await tx.user.create({
        data: {
          email: createStudentDto.email,
          password: hashedPassword,
          role: UserRole.STUDENT,
          tenantId: tenantId,
        },
      });

      // D. Créer la fiche élève (Student) liée au User
      const newStudent = await tx.student.create({
        data: {
          // Liaison
          userId: newUser.id,
          tenantId: tenantId,

          // A. IDENTITÉ
          birthName: createStudentDto.birthName,
          firstName: createStudentDto.firstName,
          birthDate: new Date(createStudentDto.birthDate),
          birthCity: createStudentDto.birthCity,
          birthZipCode: createStudentDto.birthZipCode,
          birthCountry: createStudentDto.birthCountry,

          // B. CONTACT
          address: createStudentDto.address,
          city: createStudentDto.city,
          zipCode: createStudentDto.zipCode,
          phone: createStudentDto.phone,

          // C. DOCUMENTS ANTS
          neph: createStudentDto.neph,
          ePhotoCode: createStudentDto.ePhotoCode,
          hasIdCard: createStudentDto.hasIdCard ?? false,
          hasProofOfAddress: createStudentDto.hasProofOfAddress ?? false,
          hasAssr2: createStudentDto.hasAssr2 ?? false,
          hasJdcCertificate: createStudentDto.hasJdcCertificate ?? false,
          hasCensusCertificate: createStudentDto.hasCensusCertificate ?? false,
          needsMedicalOpinion: createStudentDto.needsMedicalOpinion ?? false,
          hasMedicalOpinion: createStudentDto.hasMedicalOpinion ?? false,

          // D. FORMATION
          licenseType: createStudentDto.licenseType,
          status: createStudentDto.status ?? StudentStatus.PROSPECT,
          minutesPurchased: createStudentDto.minutesPurchased ?? 0,
          minutesUsed: 0, // Toujours 0 à la création

          // E. REPRÉSENTANT LÉGAL
          guardianName: createStudentDto.guardianName,
          guardianPhone: createStudentDto.guardianPhone,
          guardianEmail: createStudentDto.guardianEmail,
          guardianRelation: createStudentDto.guardianRelation,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      });

      return newStudent;
    });
  }

  /**
   * Récupère tous les élèves d'un tenant
   * Exclut les élèves archivés par défaut
   */
  async findAll(tenantId: string, includeArchived = false) {
    return this.prisma.student.findMany({
      where: {
        tenantId,
        ...(includeArchived ? {} : { archivedAt: null }),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Récupère un élève par son ID
   */
  async findOne(id: string, tenantId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException(`Élève #${id} introuvable`);
    }

    // Vérification tenant (sécurité multi-tenant)
    if (student.tenantId !== tenantId) {
      throw new ForbiddenException('Accès interdit à cette ressource');
    }

    return student;
  }

  /**
   * Met à jour un élève
   */
  async update(
    id: string,
    updateStudentDto: UpdateStudentDto,
    tenantId: string,
  ) {
    // Vérifier que l'élève existe et appartient au tenant
    await this.findOne(id, tenantId);

    // Si mise à jour de l'email
    if (updateStudentDto.email) {
      const student = await this.prisma.student.findUnique({
        where: { id },
        include: { user: true },
      });

      if (!student) {
        throw new NotFoundException(`Élève #${id} introuvable`);
      }

      // Vérifier si le nouvel email est déjà pris
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateStudentDto.email },
      });

      if (existingUser && existingUser.id !== student.userId) {
        throw new ConflictException('Cet email est déjà utilisé.');
      }

      // Mettre à jour l'email du User associé
      await this.prisma.user.update({
        where: { id: student.userId },
        data: { email: updateStudentDto.email },
      });
    }

    // Si mise à jour du NEPH
    if (updateStudentDto.neph) {
      const existingNeph = await this.prisma.student.findUnique({
        where: { neph: updateStudentDto.neph },
      });

      if (existingNeph && existingNeph.id !== id) {
        throw new ConflictException('Ce numéro NEPH est déjà utilisé.');
      }
    }

    // Préparer les données (exclure email et password qui sont dans User)
    const {
      email: _email,
      password: _password,
      ...studentData
    } = updateStudentDto;

    // Conversion de la date si présente
    if (studentData.birthDate) {
      (studentData.birthDate as any) = new Date(studentData.birthDate);
    }

    // Conversion de archivedAt si présente
    if (studentData.archivedAt !== undefined) {
      (studentData.archivedAt as any) = studentData.archivedAt
        ? new Date(studentData.archivedAt)
        : null;
    }

    return this.prisma.student.update({
      where: { id },
      data: studentData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  /**
   * Archive un élève (soft delete)
   */
  async archive(id: string, tenantId: string) {
    await this.findOne(id, tenantId);

    return this.prisma.student.update({
      where: { id },
      data: {
        archivedAt: new Date(),
        status: StudentStatus.ARCHIVED,
      },
    });
  }

  /**
   * Restaure un élève archivé
   */
  async restore(id: string, tenantId: string) {
    const student = await this.findOne(id, tenantId);

    if (!student.archivedAt) {
      throw new ConflictException("Cet élève n'est pas archivé");
    }

    return this.prisma.student.update({
      where: { id },
      data: {
        archivedAt: null,
        status: StudentStatus.ACTIVE,
      },
    });
  }

  /**
   * Supprime définitivement un élève (hard delete)
   * À utiliser avec précaution - supprime aussi le User associé
   */
  async remove(id: string, tenantId: string) {
    const student = await this.findOne(id, tenantId);

    return this.prisma.$transaction(async (tx) => {
      // Supprimer d'abord le Student
      await tx.student.delete({
        where: { id },
      });

      // Puis supprimer le User associé
      await tx.user.delete({
        where: { id: student.userId },
      });
    });
  }

  /**
   * Calcule les heures restantes pour un élève
   */
  async getRemainingMinutes(id: string, tenantId: string): Promise<number> {
    const student = await this.findOne(id, tenantId);
    return student.minutesPurchased - student.minutesUsed;
  }

  /**
   * Ajoute des heures achetées
   */
  async addPurchasedMinutes(id: string, minutes: number, tenantId: string) {
    await this.findOne(id, tenantId);

    return this.prisma.student.update({
      where: { id },
      data: {
        minutesPurchased: {
          increment: minutes,
        },
      },
    });
  }

  /**
   * Enregistre des heures consommées
   */
  async addUsedMinutes(id: string, minutes: number, tenantId: string) {
    const student = await this.findOne(id, tenantId);

    const newUsedMinutes = student.minutesUsed + minutes;

    if (newUsedMinutes > student.minutesPurchased) {
      throw new ConflictException(
        `Heures insuffisantes. Disponibles: ${student.minutesPurchased - student.minutesUsed} min, Demandées: ${minutes} min`,
      );
    }

    return this.prisma.student.update({
      where: { id },
      data: {
        minutesUsed: newUsedMinutes,
      },
    });
  }
}
