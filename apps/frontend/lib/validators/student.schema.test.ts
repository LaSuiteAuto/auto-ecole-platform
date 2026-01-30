import {
  createStudentSchema,
  LicenseTypeEnum,
} from './student.schema';

describe('createStudentSchema', () => {
  // Données valides de base pour un adulte
  const validAdultData = {
    email: 'eleve@test.fr',
    password: 'Password123!',
    birthName: 'DUPONT',
    firstName: 'Marie',
    birthDate: '2000-01-15', // Adulte
    birthCity: 'Paris',
    birthCountry: 'FRANCE',
    address: '12 rue de la République',
    city: 'Lyon',
    zipCode: '69001',
    phone: '0612345678',
    licenseType: 'B' as const,
  };

  // Données valides de base pour un mineur
  const validMinorData = {
    ...validAdultData,
    birthDate: '2015-01-15', // Mineur (< 18 ans)
    guardianName: 'Jean DUPONT',
    guardianPhone: '0698765432',
  };

  describe('Validation des champs obligatoires', () => {
    it('devrait accepter des données valides pour un adulte', () => {
      const result = createStudentSchema.safeParse(validAdultData);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter un email invalide', () => {
      const data = { ...validAdultData, email: 'invalid-email' };
      const result = createStudentSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('email');
        expect(result.error.issues[0].message).toBe("Format d'email invalide");
      }
    });

    it('devrait rejeter un email vide', () => {
      const data = { ...validAdultData, email: '' };
      const result = createStudentSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('email');
      }
    });

    it('devrait rejeter un mot de passe trop court', () => {
      const data = { ...validAdultData, password: '1234567' };
      const result = createStudentSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('password');
        expect(result.error.issues[0].message).toBe('Le mot de passe doit contenir au moins 8 caractères');
      }
    });

    it('devrait rejeter un nom de naissance trop court', () => {
      const data = { ...validAdultData, birthName: 'A' };
      const result = createStudentSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('birthName');
      }
    });

    it('devrait rejeter un prénom trop court', () => {
      const data = { ...validAdultData, firstName: 'A' };
      const result = createStudentSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('firstName');
      }
    });

    it('devrait rejeter une date de naissance vide', () => {
      const data = { ...validAdultData, birthDate: '' };
      const result = createStudentSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('birthDate');
      }
    });

    it('devrait rejeter une ville de naissance vide', () => {
      const data = { ...validAdultData, birthCity: '' };
      const result = createStudentSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('birthCity');
      }
    });

    it('devrait rejeter un pays de naissance vide', () => {
      const data = { ...validAdultData, birthCountry: '' };
      const result = createStudentSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('birthCountry');
      }
    });
  });

  describe('Validation de l\'adresse', () => {
    it('devrait rejeter une adresse trop courte', () => {
      const data = { ...validAdultData, address: '123' };
      const result = createStudentSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('address');
      }
    });

    it('devrait rejeter une ville vide', () => {
      const data = { ...validAdultData, city: '' };
      const result = createStudentSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('city');
      }
    });

    it('devrait rejeter un code postal invalide', () => {
      const data = { ...validAdultData, zipCode: '123' };
      const result = createStudentSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('zipCode');
        expect(result.error.issues[0].message).toBe('Le code postal doit contenir 5 chiffres');
      }
    });

    it('devrait rejeter un code postal avec des lettres', () => {
      const data = { ...validAdultData, zipCode: '75AB1' };
      const result = createStudentSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('zipCode');
      }
    });

    it('devrait accepter un code postal valide', () => {
      const data = { ...validAdultData, zipCode: '75001' };
      const result = createStudentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('Validation du téléphone', () => {
    it('devrait accepter un numéro français valide', () => {
      const data = { ...validAdultData, phone: '0612345678' };
      const result = createStudentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('devrait accepter un numéro au format international', () => {
      const data = { ...validAdultData, phone: '+33612345678' };
      const result = createStudentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter un numéro trop court', () => {
      const data = { ...validAdultData, phone: '061234567' };
      const result = createStudentSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('phone');
        expect(result.error.issues[0].message).toBe('Numéro trop court');
      }
    });

    it('devrait rejeter un numéro avec des caractères invalides', () => {
      const data = { ...validAdultData, phone: '06-12-34-56-78' };
      const result = createStudentSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('phone');
      }
    });
  });

  describe('Validation du type de permis', () => {
    it('devrait accepter le permis B', () => {
      const data = { ...validAdultData, licenseType: 'B' };
      const result = createStudentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('devrait accepter le permis AAC', () => {
      const data = { ...validAdultData, licenseType: 'AAC' };
      const result = createStudentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('devrait accepter le permis CS', () => {
      const data = { ...validAdultData, licenseType: 'CS' };
      const result = createStudentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('devrait accepter le permis A1', () => {
      const data = { ...validAdultData, licenseType: 'A1' };
      const result = createStudentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('devrait accepter le permis A2', () => {
      const data = { ...validAdultData, licenseType: 'A2' };
      const result = createStudentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter un type de permis invalide', () => {
      const data = { ...validAdultData, licenseType: 'INVALID' };
      const result = createStudentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('Validation conditionnelle pour mineurs', () => {
    it('devrait accepter un mineur avec représentant légal complet', () => {
      const result = createStudentSchema.safeParse(validMinorData);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter un mineur sans nom de représentant légal', () => {
      const data = { ...validMinorData, guardianName: '' };
      const result = createStudentSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const guardianNameError = result.error.issues.find(
          (issue) => issue.path.includes('guardianName')
        );
        expect(guardianNameError).toBeDefined();
        expect(guardianNameError?.message).toBe('Le nom du représentant légal est requis pour un mineur');
      }
    });

    it('devrait rejeter un mineur sans téléphone de représentant légal', () => {
      const data = { ...validMinorData, guardianPhone: '' };
      const result = createStudentSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const guardianPhoneError = result.error.issues.find(
          (issue) => issue.path.includes('guardianPhone')
        );
        expect(guardianPhoneError).toBeDefined();
        expect(guardianPhoneError?.message).toBe('Le téléphone du représentant légal est requis pour un mineur');
      }
    });

    it('devrait rejeter un mineur avec représentant légal undefined', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { guardianName, guardianPhone, ...dataWithoutGuardian } = validMinorData;
      const result = createStudentSchema.safeParse(dataWithoutGuardian);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('devrait accepter un adulte sans représentant légal', () => {
      const data = { ...validAdultData }; // Adulte sans guardian
      const result = createStudentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('devrait accepter un adulte avec représentant légal optionnel', () => {
      const data = {
        ...validAdultData,
        guardianName: 'Jean DUPONT',
        guardianPhone: '0698765432',
      };
      const result = createStudentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('Validation des champs optionnels', () => {
    it('devrait accepter un code postal de naissance vide', () => {
      const data = { ...validAdultData, birthZipCode: '' };
      const result = createStudentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('devrait accepter sans NEPH', () => {
      const data = { ...validAdultData };
      const result = createStudentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('devrait accepter avec NEPH', () => {
      const data = { ...validAdultData, neph: '123456789012' };
      const result = createStudentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('devrait accepter les documents booléens', () => {
      const data = {
        ...validAdultData,
        hasIdCard: true,
        hasProofOfAddress: true,
        hasAssr2: false,
        hasJdcCertificate: false,
        hasCensusCertificate: true,
        needsMedicalOpinion: true,
        hasMedicalOpinion: false,
      };
      const result = createStudentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('devrait accepter les heures achetées à 0', () => {
      const data = { ...validAdultData, hoursPurchased: 0 };
      const result = createStudentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('devrait accepter les heures achetées positives', () => {
      const data = { ...validAdultData, hoursPurchased: 20 };
      const result = createStudentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter les heures achetées négatives', () => {
      const data = { ...validAdultData, hoursPurchased: -5 };
      const result = createStudentSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('hoursPurchased');
      }
    });
  });
});

describe('LicenseTypeEnum', () => {
  it('devrait contenir toutes les options valides', () => {
    expect(LicenseTypeEnum.options).toEqual(['B', 'AAC', 'CS', 'A1', 'A2']);
  });

  it('devrait parser une valeur valide', () => {
    expect(LicenseTypeEnum.parse('B')).toBe('B');
    expect(LicenseTypeEnum.parse('AAC')).toBe('AAC');
  });

  it('devrait rejeter une valeur invalide', () => {
    expect(() => LicenseTypeEnum.parse('INVALID')).toThrow();
  });
});
