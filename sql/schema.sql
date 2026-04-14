-- TranspoBot Sénégal 🇸🇳 - Structure de la Base de Données (UTF8MB4)
-- Ce fichier ne contient que la structure. Les données sont peuplées par le seeder Python.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for utilisateurs
-- ----------------------------
DROP TABLE IF EXISTS `utilisateurs`;
CREATE TABLE `utilisateurs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(100) NOT NULL,
  `hashed_password` varchar(255) NOT NULL,
  `role` enum('admin','manager','driver') DEFAULT 'manager',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Table structure for vehicules
-- ----------------------------
DROP TABLE IF EXISTS `vehicules`;
CREATE TABLE `vehicules` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `immatriculation` varchar(50) DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  `capacite` int(11) DEFAULT NULL,
  `statut` varchar(50) DEFAULT NULL,
  `kilometrage` int(11) DEFAULT NULL,
  `date_acquisition` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Table structure for chauffeurs
-- ----------------------------
DROP TABLE IF EXISTS `chauffeurs`;
CREATE TABLE `chauffeurs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) DEFAULT NULL,
  `prenom` varchar(100) DEFAULT NULL,
  `telephone` varchar(20) DEFAULT NULL,
  `numero_permis` varchar(50) DEFAULT NULL,
  `categorie_permis` varchar(10) DEFAULT NULL,
  `disponibilite` tinyint(1) DEFAULT NULL,
  `date_embauche` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Table structure for lignes
-- ----------------------------
DROP TABLE IF EXISTS `lignes`;
CREATE TABLE `lignes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(20) DEFAULT NULL,
  `nom` varchar(100) DEFAULT NULL,
  `origine` varchar(100) DEFAULT NULL,
  `destination` varchar(100) DEFAULT NULL,
  `distance_km` float DEFAULT NULL,
  `duree_minutes` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Table structure for trajets
-- ----------------------------
DROP TABLE IF EXISTS `trajets`;
CREATE TABLE `trajets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ligne_id` int(11) DEFAULT NULL,
  `chauffeur_id` int(11) DEFAULT NULL,
  `vehicule_id` int(11) DEFAULT NULL,
  `date_heure_depart` datetime DEFAULT NULL,
  `date_heure_arrivee` datetime DEFAULT NULL,
  `statut` varchar(50) DEFAULT NULL,
  `nb_passagers` int(11) DEFAULT NULL,
  `recette` float DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Table structure for incidents
-- ----------------------------
DROP TABLE IF EXISTS `incidents`;
CREATE TABLE `incidents` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `trajet_id` int(11) DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `gravite` varchar(50) DEFAULT NULL,
  `date_incident` datetime DEFAULT NULL,
  `resolu` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Data for vehicules (30 Véhicules)
-- ----------------------------
INSERT INTO `vehicules` (immatriculation, type, capacite, statut, kilometrage, date_acquisition) VALUES 
('DK-1001-AB', 'Bus (Premium)', 60, 'actif', 12000, '2023-01-01'),
('DK-1002-CD', 'Bus (Premium)', 60, 'actif', 15000, '2023-02-15'),
('TH-2001-XY', 'Minibus', 25, 'actif', 45000, '2022-03-20'),
('SL-3001-GH', 'Bus (Eco)', 60, 'maintenance', 88000, '2021-11-10'),
('KL-4001-JK', 'Taxi-Be', 5, 'actif', 120000, '2020-05-05'),
('ZG-5001-LM', 'Minibus', 25, 'actif', 33000, '2022-09-12'),
('DK-6001-PQ', 'Bus (Eco)', 60, 'actif', 55000, '2021-08-10'),
('TH-7001-RS', 'Minibus', 25, 'actif', 22000, '2023-12-01'),
('DK-8001-TU', 'Bus (Premium)', 60, 'actif', 8000, '2024-01-05'),
('SL-9001-VW', 'Taxi-Be', 5, 'actif', 95000, '2019-06-15');
-- (Les 20 autres sont générés dynamiquement par le seeder Python pour la diversité)

-- ----------------------------
-- Data for chauffeurs (20 Chauffeurs)
-- ----------------------------
INSERT INTO `chauffeurs` (nom, prenom, telephone, numero_permis, categorie_permis, disponibilite, date_embauche) VALUES 
('DIOP', 'Mamadou', '+221770000001', 'P-SN-001', 'D', 1, '2020-01-10'),
('FALL', 'Ibrahima', '+221770000002', 'P-SN-002', 'D', 1, '2020-05-20'),
('NDIAYE', 'Fatou', '+221770000003', 'P-SN-003', 'B', 1, '2021-03-15'),
('SARR', 'Ousmane', '+221770000004', 'P-SN-004', 'D', 1, '2021-08-01'),
('SY', 'Aminata', '+221770000005', 'P-SN-005', 'D', 1, '2022-02-10'),
('BA', 'Assane', '+221770000006', 'P-SN-006', 'D', 1, '2019-12-25'),
('FAYE', 'Awa', '+221770000007', 'P-SN-007', 'B', 1, '2022-06-30'),
('GUEYE', 'Aliou', '+221770000008', 'P-SN-008', 'D', 1, '2023-01-05');

-- ----------------------------
-- Data for lignes (15 Lignes Nationales)
-- ----------------------------
INSERT INTO `lignes` (code, nom, origine, destination, distance_km, duree_minutes) VALUES 
('L01', 'Dakar - Thiès', 'Dakar (Pikine)', 'Thiès', 70, 90),
('L02', 'Dakar - Mbour', 'Dakar (Plateau)', 'Mbour', 85, 120),
('L03', 'Dakar - Saint-Louis', 'Dakar Gare', 'Saint-Louis', 260, 280),
('L04', 'Dakar - Touba', 'Dakar Centre', 'Touba', 190, 210),
('L05', 'Dakar - Kaolack', 'Dakar', 'Kaolack', 190, 220),
('L06', 'Thiès - Diourbel', 'Thiès', 'Diourbel', 75, 100),
('L07', 'Mbour - Saly', 'Mbour', 'Saly Portudal', 15, 30),
('L08', 'Dakar - Ziguinchor', 'Dakar Port', 'Ziguinchor', 450, 720),
('L09', 'Saint-Louis - Richard Toll', 'Saint-Louis', 'Richard Toll', 100, 120),
('L10', 'Dakar - AIBD (Express)', 'Dakar Plateau', 'Aéroport AIBD', 55, 60);

-- ----------------------------
-- Table structure for maintenance
-- ----------------------------
DROP TABLE IF EXISTS `maintenance`;
CREATE TABLE `maintenance` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `vehicule_id` int(11) DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `date_prevue` date DEFAULT NULL,
  `date_realisee` date DEFAULT NULL,
  `cout` float DEFAULT NULL,
  `effectuee` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Table structure for plannings
-- ----------------------------
DROP TABLE IF EXISTS `plannings`;
CREATE TABLE `plannings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ligne_id` int(11) DEFAULT NULL,
  `chauffeur_id` int(11) DEFAULT NULL,
  `vehicule_id` int(11) DEFAULT NULL,
  `date_heure_depart_prevue` datetime DEFAULT NULL,
  `date_heure_arrivee_prevue` datetime DEFAULT NULL,
  `statut` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Table structure for tarifs
-- ----------------------------
DROP TABLE IF EXISTS `tarifs`;
CREATE TABLE `tarifs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ligne_id` int(11) DEFAULT NULL,
  `type_client` varchar(50) DEFAULT NULL,
  `prix` float DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Table structure for affectations
-- ----------------------------
DROP TABLE IF EXISTS `affectations`;
CREATE TABLE `affectations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `chauffeur_id` int(11) DEFAULT NULL,
  `vehicule_id` int(11) DEFAULT NULL,
  `date_debut` date DEFAULT NULL,
  `date_fin` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET FOREIGN_KEY_CHECKS = 1;
