-- TranspoBot Sénégal 🇸🇳 - Base de Données Optimisée (Sénégal)
-- Structure complète avec clés étrangères, index et données d'exemple

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- 1. TABLE utilisateurs
-- =====================================================
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

INSERT INTO `utilisateurs` (username, hashed_password, role) VALUES
('admin_dakar', '$2y$10$ABC123DEF456GHI789JKL', 'admin'),
('manager_thies', '$2y$10$MNO123PQR456STU789VWX', 'manager'),
('driver_diop', '$2y$10$YZA123BCD456EFG789HIJ', 'driver'),
('manager_saintlouis', '$2y$10$KLM123NOP456QRS789TUV', 'manager'),
('driver_fall', '$2y$10$WXY123ZAB456CDE789FGH', 'driver'),
('admin_ziguinchor', '$2y$10$IJK123LMN456OPQ789RST', 'admin'),
('manager_touba', '$2y$10$UVW123XYZ456ABC789DEF', 'manager'),
('driver_ndiaye', '$2y$10$GHI123JKL456MNO789PQR', 'driver'),
('manager_kaolack', '$2y$10$STU123VWX456YZA789BCD', 'manager'),
('driver_sarr', '$2y$10$EFG123HIJ456KLM789NOP', 'driver'),
('admin_thies', '$2y$10$QRS123TUV456WXY789ZAB', 'admin'),
('manager_mbour', '$2y$10$CDE123FGH456IJK789LMN', 'manager'),
('driver_sy', '$2y$10$OPQ123RST456UVW789XYZ', 'driver'),
('driver_ba', '$2y$10$ABC456DEF789GHI012JKL', 'driver'),
('driver_faye', '$2y$10$MNO456PQR789STU012VWX', 'driver'),
('manager_diourbel', '$2y$10$YZA456BCD789EFG012HIJ', 'manager'),
('driver_gueye', '$2y$10$KLM456NOP789QRS012TUV', 'driver'),
('admin_tambacounda', '$2y$10$WXY456ZAB789CDE012FGH', 'admin'),
('manager_saly', '$2y$10$IJK456LMN789OPQ012RST', 'manager'),
('driver_diallo', '$2y$10$UVW456XYZ789ABC012DEF', 'driver');

-- =====================================================
-- 2. TABLE vehicules
-- =====================================================
DROP TABLE IF EXISTS `vehicules`;
CREATE TABLE `vehicules` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `immatriculation` varchar(50) DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  `capacite` int(11) DEFAULT NULL,
  `statut` varchar(50) DEFAULT NULL,
  `kilometrage` int(11) DEFAULT NULL,
  `date_acquisition` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_vehicules_statut` (`statut`),
  KEY `idx_vehicules_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `vehicules` (immatriculation, type, capacite, statut, kilometrage, date_acquisition) VALUES
('DK-1001-AB', 'Bus Premium', 60, 'actif', 12500, '2023-01-10'),
('DK-1002-CD', 'Bus Premium', 60, 'actif', 15800, '2023-02-15'),
('TH-2001-XY', 'Minibus', 25, 'actif', 45200, '2022-03-20'),
('SL-3001-GH', 'Bus Eco', 60, 'maintenance', 88500, '2021-11-10'),
('KL-4001-JK', 'Taxi-Be', 5, 'actif', 121000, '2020-05-05'),
('ZG-5001-LM', 'Minibus', 25, 'actif', 33500, '2022-09-12'),
('DK-6001-PQ', 'Bus Eco', 60, 'actif', 55800, '2021-08-10'),
('TH-7001-RS', 'Minibus', 25, 'actif', 22400, '2023-12-01'),
('DK-8001-TU', 'Bus Premium', 60, 'actif', 8200, '2024-01-05'),
('SL-9001-VW', 'Taxi-Be', 5, 'actif', 95800, '2019-06-15'),
('DK-1102-ZA', 'Bus Premium', 60, 'actif', 3200, '2024-03-10'),
('TH-2102-BC', 'Minibus', 25, 'maintenance', 67800, '2020-08-22'),
('SL-3102-DE', 'Bus Eco', 60, 'actif', 112000, '2018-12-01'),
('KL-4102-FG', 'Taxi-Be', 5, 'actif', 45000, '2022-11-18'),
('ZG-5102-HI', 'Minibus', 25, 'actif', 18900, '2023-07-04'),
('DK-6102-JK', 'Bus Eco', 60, 'actif', 72300, '2020-03-14'),
('TH-7102-LM', 'Minibus', 25, 'actif', 41000, '2021-10-29'),
('DK-8102-NO', 'Bus Premium', 60, 'maintenance', 15200, '2023-09-17'),
('SL-9102-PQ', 'Taxi-Be', 5, 'actif', 67200, '2021-04-06'),
('ZG-0203-RS', 'Minibus', 25, 'actif', 5600, '2024-02-28');

-- =====================================================
-- 3. TABLE chauffeurs
-- =====================================================
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
  PRIMARY KEY (`id`),
  KEY `idx_chauffeurs_disponibilite` (`disponibilite`),
  KEY `idx_chauffeurs_nom` (`nom`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `chauffeurs` (nom, prenom, telephone, numero_permis, categorie_permis, disponibilite, date_embauche) VALUES
('DIOP', 'Mamadou', '+221770000001', 'P-SN-001', 'D', 1, '2020-01-10'),
('FALL', 'Ibrahima', '+221770000002', 'P-SN-002', 'D', 1, '2020-05-20'),
('NDIAYE', 'Fatou', '+221770000003', 'P-SN-003', 'D', 1, '2021-03-15'),
('SARR', 'Ousmane', '+221770000004', 'P-SN-004', 'D', 1, '2021-08-01'),
('SY', 'Aminata', '+221770000005', 'P-SN-005', 'D', 1, '2022-02-10'),
('BA', 'Assane', '+221770000006', 'P-SN-006', 'D', 1, '2019-12-25'),
('FAYE', 'Awa', '+221770000007', 'P-SN-007', 'D', 1, '2022-06-30'),
('GUEYE', 'Aliou', '+221770000008', 'P-SN-008', 'D', 1, '2023-01-05'),
('DIALLO', 'Moussa', '+221770000009', 'P-SN-009', 'D', 1, '2021-11-12'),
('SOW', 'Mariama', '+221770000010', 'P-SN-010', 'D', 1, '2022-08-19'),
('NDOUR', 'Papa', '+221770000011', 'P-SN-011', 'D', 0, '2020-09-03'),
('THIAM', 'Aissatou', '+221770000012', 'P-SN-012', 'D', 1, '2023-03-27'),
('KANE', 'Mamadou', '+221770000013', 'P-SN-013', 'D', 1, '2019-07-14'),
('LY', 'Fatima', '+221770000014', 'P-SN-014', 'D', 0, '2021-01-22'),
('SECK', 'Amadou', '+221770000015', 'P-SN-015', 'D', 1, '2022-12-08'),
('GOMIS', 'Rokhaya', '+221770000016', 'P-SN-016', 'D', 1, '2020-06-17'),
('MBODJ', 'Cheikh', '+221770000017', 'P-SN-017', 'D', 1, '2023-10-30'),
('SENE', 'Ndeye', '+221770000018', 'P-SN-018', 'D', 1, '2021-05-05'),
('DIAGNE', 'Boubacar', '+221770000019', 'P-SN-019', 'D', 0, '2020-11-11'),
('NDONG', 'Arame', '+221770000020', 'P-SN-020', 'D', 1, '2024-01-15');

-- =====================================================
-- 4. TABLE lignes
-- =====================================================
DROP TABLE IF EXISTS `lignes`;
CREATE TABLE `lignes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(20) DEFAULT NULL,
  `nom` varchar(100) DEFAULT NULL,
  `origine` varchar(100) DEFAULT NULL,
  `destination` varchar(100) DEFAULT NULL,
  `distance_km` float DEFAULT NULL,
  `duree_minutes` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_lignes_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `lignes` (code, nom, origine, destination, distance_km, duree_minutes) VALUES
('L01', 'Dakar - Thiès', 'Dakar (Pikine)', 'Thiès', 70, 90),
('L02', 'Dakar - Mbour', 'Dakar (Plateau)', 'Mbour', 85, 120),
('L03', 'Dakar - Saint-Louis', 'Dakar Gare Routière', 'Saint-Louis', 260, 280),
('L04', 'Dakar - Touba', 'Dakar Centre', 'Touba', 190, 210),
('L05', 'Dakar - Kaolack', 'Dakar', 'Kaolack', 190, 220),
('L06', 'Thiès - Diourbel', 'Thiès', 'Diourbel', 75, 100),
('L07', 'Mbour - Saly', 'Mbour', 'Saly Portudal', 15, 30),
('L08', 'Dakar - Ziguinchor', 'Dakar Port', 'Ziguinchor', 450, 480),
('L09', 'Saint-Louis - Richard Toll', 'Saint-Louis', 'Richard Toll', 100, 120),
('L10', 'Dakar - AIBD (Express)', 'Dakar Plateau', 'Aéroport AIBD', 55, 60),
('L11', 'Thiès - Tivaouane', 'Thiès', 'Tivaouane', 45, 55),
('L12', 'Kaolack - Fatick', 'Kaolack', 'Fatick', 65, 80),
('L13', 'Ziguinchor - Cap Skirring', 'Ziguinchor', 'Cap Skirring', 70, 90),
('L14', 'Tambacounda - Kédougou', 'Tambacounda', 'Kédougou', 210, 240),
('L15', 'Dakar - Rufisque', 'Dakar', 'Rufisque', 35, 50),
('L16', 'Saint-Louis - Louga', 'Saint-Louis', 'Louga', 120, 140),
('L17', 'Mbour - Fatick', 'Mbour', 'Fatick', 100, 130),
('L18', 'Thiès - Mbour', 'Thiès', 'Mbour', 60, 80),
('L19', 'Dakar - Diamniadio', 'Dakar', 'Diamniadio', 35, 45),
('L20', 'Touba - Mbacké', 'Touba', 'Mbacké', 10, 20);

-- =====================================================
-- 5. TABLE trajets (avec clés étrangères)
-- =====================================================
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
  PRIMARY KEY (`id`),
  KEY `idx_trajets_date_depart` (`date_heure_depart`),
  KEY `idx_trajets_statut` (`statut`),
  KEY `idx_trajets_ligne` (`ligne_id`),
  KEY `idx_trajets_chauffeur` (`chauffeur_id`),
  KEY `idx_trajets_vehicule` (`vehicule_id`),
  CONSTRAINT `fk_trajets_ligne` FOREIGN KEY (`ligne_id`) REFERENCES `lignes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_trajets_chauffeur` FOREIGN KEY (`chauffeur_id`) REFERENCES `chauffeurs` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_trajets_vehicule` FOREIGN KEY (`vehicule_id`) REFERENCES `vehicules` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `trajets` (ligne_id, chauffeur_id, vehicule_id, date_heure_depart, date_heure_arrivee, statut, nb_passagers, recette) VALUES
(1, 1, 1, '2024-03-15 06:00:00', '2024-03-15 07:30:00', 'termine', 55, 82500),
(1, 2, 2, '2024-03-15 08:00:00', '2024-03-15 09:35:00', 'termine', 60, 90000),
(2, 3, 3, '2024-03-15 07:00:00', '2024-03-15 09:00:00', 'termine', 24, 60000),
(2, 4, 4, '2024-03-15 10:00:00', '2024-03-15 12:15:00', 'termine', 58, 145000),
(3, 5, 5, '2024-03-15 05:30:00', '2024-03-15 10:10:00', 'termine', 60, 180000),
(3, 6, 6, '2024-03-15 13:00:00', '2024-03-15 17:40:00', 'termine', 55, 165000),
(4, 7, 7, '2024-03-16 06:00:00', '2024-03-16 09:30:00', 'termine', 50, 125000),
(4, 8, 8, '2024-03-16 14:00:00', '2024-03-16 17:40:00', 'annule', 0, 0),
(5, 9, 9, '2024-03-16 07:00:00', '2024-03-16 10:40:00', 'termine', 60, 150000),
(6, 10, 10, '2024-03-16 08:30:00', '2024-03-16 10:10:00', 'termine', 25, 50000),
(7, 11, 11, '2024-03-16 09:00:00', '2024-03-16 09:30:00', 'termine', 5, 7500),
(8, 12, 12, '2024-03-17 04:00:00', '2024-03-17 12:00:00', 'en_cours', 45, 225000),
(9, 13, 13, '2024-03-17 06:30:00', '2024-03-17 08:30:00', 'termine', 24, 48000),
(10, 14, 14, '2024-03-17 07:00:00', '2024-03-17 08:00:00', 'termine', 60, 120000),
(11, 15, 15, '2024-03-17 10:00:00', '2024-03-17 10:55:00', 'termine', 25, 37500),
(12, 16, 16, '2024-03-18 05:00:00', '2024-03-18 06:20:00', 'termine', 60, 90000),
(13, 17, 17, '2024-03-18 08:00:00', '2024-03-18 09:30:00', 'termine', 5, 10000),
(14, 18, 18, '2024-03-18 06:00:00', '2024-03-18 10:00:00', 'termine', 60, 120000),
(15, 19, 19, '2024-03-18 07:30:00', '2024-03-18 08:20:00', 'termine', 60, 90000),
(16, 20, 20, '2024-03-19 05:00:00', '2024-03-19 07:20:00', 'programme', NULL, NULL);

-- =====================================================
-- 6. TABLE incidents
-- =====================================================
DROP TABLE IF EXISTS `incidents`;
CREATE TABLE `incidents` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `trajet_id` int(11) DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `gravite` varchar(50) DEFAULT NULL,
  `date_incident` datetime DEFAULT NULL,
  `resolu` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_incidents_trajet` (`trajet_id`),
  KEY `idx_incidents_date` (`date_incident`),
  CONSTRAINT `fk_incidents_trajet` FOREIGN KEY (`trajet_id`) REFERENCES `trajets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `incidents` (trajet_id, type, description, gravite, date_incident, resolu) VALUES
(1, 'retard', 'Embourrage à la sortie de Pikine', 'mineure', '2024-03-15 06:45:00', 1),
(3, 'panne', 'Panne de climatisation à Mbour', 'moyenne', '2024-03-15 08:30:00', 1),
(5, 'accident', 'Accrochage léger à Saint-Louis', 'grave', '2024-03-15 09:15:00', 1),
(8, 'annulation', 'Grève des chauffeurs à Touba', 'moyenne', '2024-03-16 14:00:00', 1),
(12, 'retard', 'Route coupée à Kolda', 'mineure', '2024-03-17 08:30:00', 0),
(14, 'panne', 'Pneu crevé à l\'AIBD', 'mineure', '2024-03-17 07:30:00', 1),
(2, 'retard', 'Contrôle de police à Thiès', 'mineure', '2024-03-15 08:45:00', 1),
(6, 'panne', 'Problème moteur à Kaolack', 'grave', '2024-03-15 15:30:00', 1),
(10, 'retard', 'Embourrage à Diourbel', 'mineure', '2024-03-16 09:15:00', 1),
(15, 'annulation', 'Manifestation à Diamniadio', 'moyenne', '2024-03-18 07:45:00', 1),
(4, 'panne', 'Surchauffe moteur à Mbour', 'moyenne', '2024-03-15 11:00:00', 1),
(9, 'retard', 'Pluies à Richard Toll', 'mineure', '2024-03-17 07:15:00', 1),
(13, 'accident', 'Collision avec charrette', 'grave', '2024-03-18 08:45:00', 0),
(7, 'retard', 'Route en mauvais état', 'mineure', '2024-03-16 09:10:00', 1),
(11, 'panne', 'Batterie déchargée', 'mineure', '2024-03-17 10:30:00', 1),
(16, 'retard', 'Problème de permis', 'mineure', '2024-03-19 06:15:00', 0),
(17, 'panne', 'Courroie cassée', 'moyenne', '2024-03-18 08:45:00', 1),
(18, 'accident', 'Sortie de route', 'grave', '2024-03-18 09:30:00', 0),
(19, 'retard', 'Embourrage à Rufisque', 'mineure', '2024-03-18 07:50:00', 1),
(20, 'panne', 'Problème électrique', 'moyenne', '2024-03-19 06:30:00', 0);

-- =====================================================
-- 7. TABLE maintenance (avec kilometrage ajouté)
-- =====================================================
DROP TABLE IF EXISTS `maintenance`;
CREATE TABLE `maintenance` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `vehicule_id` int(11) DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `date_prevue` date DEFAULT NULL,
  `date_realisee` date DEFAULT NULL,
  `cout` float DEFAULT NULL,
  `kilometrage` int(11) DEFAULT NULL,
  `effectuee` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_maintenance_vehicule` (`vehicule_id`),
  KEY `idx_maintenance_date_prevue` (`date_prevue`),
  CONSTRAINT `fk_maintenance_vehicule` FOREIGN KEY (`vehicule_id`) REFERENCES `vehicules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `maintenance` (vehicule_id, type, description, date_prevue, date_realisee, cout, kilometrage, effectuee) VALUES
(1, 'vidange', 'Vidange moteur + filtres', '2024-02-01', '2024-02-01', 75000, 12000, 1),
(2, 'pneumatiques', 'Changement 4 pneus', '2024-02-15', '2024-02-16', 120000, 15000, 1),
(3, 'revision', 'Révision complète 45000km', '2024-03-01', '2024-03-02', 95000, 45200, 1),
(4, 'moteur', 'Réparation fuite d\'huile', '2024-03-10', '2024-03-12', 185000, 88500, 1),
(5, 'climatisation', 'Recharge gaz', '2024-02-20', '2024-02-20', 45000, 121000, 1),
(6, 'freins', 'Changement plaquettes', '2024-03-05', '2024-03-06', 55000, 33500, 1),
(7, 'vidange', 'Vidange + filtres', '2024-02-10', '2024-02-10', 70000, 55800, 1),
(8, 'pneumatiques', 'Changement 2 pneus avant', '2024-03-15', '2024-03-16', 65000, 22400, 1),
(9, 'revision', 'Révision 8000km', '2024-02-25', '2024-02-26', 85000, 8200, 1),
(10, 'moteur', 'Nettoyage injecteurs', '2024-03-20', NULL, 68000, 95800, 0),
(11, 'vidange', 'Vidange moteur', '2024-03-25', NULL, 72000, 3200, 0),
(12, 'embrayage', 'Changement kit embrayage', '2024-02-28', '2024-02-29', 145000, 67800, 1),
(13, 'pneumatiques', 'Changement 6 pneus', '2024-03-08', '2024-03-09', 180000, 112000, 1),
(14, 'vidange', 'Vidange + filtres', '2024-03-12', '2024-03-12', 68000, 45000, 1),
(15, 'revision', 'Révision 20000km', '2024-03-18', NULL, 89000, 18900, 0),
(16, 'moteur', 'Réparation courroie', '2024-02-05', '2024-02-06', 165000, 72300, 1),
(17, 'freins', 'Changement disques', '2024-03-22', NULL, 98000, 41000, 0),
(18, 'vidange', 'Vidange moteur', '2024-03-01', '2024-03-01', 73000, 15200, 1),
(19, 'pneumatiques', 'Changement 4 pneus', '2024-03-28', NULL, 125000, 67200, 0),
(20, 'climatisation', 'Réparation complète', '2024-03-15', '2024-03-16', 95000, 5600, 1);

-- =====================================================
-- 8. TABLE plannings
-- =====================================================
DROP TABLE IF EXISTS `plannings`;
CREATE TABLE `plannings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ligne_id` int(11) DEFAULT NULL,
  `chauffeur_id` int(11) DEFAULT NULL,
  `vehicule_id` int(11) DEFAULT NULL,
  `date_heure_depart_prevue` datetime DEFAULT NULL,
  `date_heure_arrivee_prevue` datetime DEFAULT NULL,
  `statut` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_plannings_date_depart` (`date_heure_depart_prevue`),
  KEY `idx_plannings_ligne` (`ligne_id`),
  KEY `idx_plannings_chauffeur` (`chauffeur_id`),
  KEY `idx_plannings_vehicule` (`vehicule_id`),
  CONSTRAINT `fk_plannings_ligne` FOREIGN KEY (`ligne_id`) REFERENCES `lignes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_plannings_chauffeur` FOREIGN KEY (`chauffeur_id`) REFERENCES `chauffeurs` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_plannings_vehicule` FOREIGN KEY (`vehicule_id`) REFERENCES `vehicules` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `plannings` (ligne_id, chauffeur_id, vehicule_id, date_heure_depart_prevue, date_heure_arrivee_prevue, statut) VALUES
(1, 1, 1, '2024-03-20 06:00:00', '2024-03-20 07:30:00', 'confirme'),
(1, 2, 2, '2024-03-20 08:00:00', '2024-03-20 09:35:00', 'confirme'),
(2, 3, 3, '2024-03-20 07:00:00', '2024-03-20 09:00:00', 'confirme'),
(2, 4, 4, '2024-03-20 10:00:00', '2024-03-20 12:15:00', 'confirme'),
(3, 5, 5, '2024-03-20 05:30:00', '2024-03-20 10:10:00', 'confirme'),
(3, 6, 6, '2024-03-20 13:00:00', '2024-03-20 17:40:00', 'confirme'),
(4, 7, 7, '2024-03-21 06:00:00', '2024-03-21 09:30:00', 'confirme'),
(4, 8, 8, '2024-03-21 14:00:00', '2024-03-21 17:40:00', 'confirme'),
(5, 9, 9, '2024-03-21 07:00:00', '2024-03-21 10:40:00', 'confirme'),
(6, 10, 10, '2024-03-21 08:30:00', '2024-03-21 10:10:00', 'confirme'),
(7, 11, 11, '2024-03-21 09:00:00', '2024-03-21 09:30:00', 'confirme'),
(8, 12, 12, '2024-03-22 04:00:00', '2024-03-22 12:00:00', 'confirme'),
(9, 13, 13, '2024-03-22 06:30:00', '2024-03-22 08:30:00', 'confirme'),
(10, 14, 14, '2024-03-22 07:00:00', '2024-03-22 08:00:00', 'confirme'),
(11, 15, 15, '2024-03-22 10:00:00', '2024-03-22 10:55:00', 'confirme'),
(12, 16, 16, '2024-03-23 05:00:00', '2024-03-23 06:20:00', 'confirme'),
(13, 17, 17, '2024-03-23 08:00:00', '2024-03-23 09:30:00', 'confirme'),
(14, 18, 18, '2024-03-23 06:00:00', '2024-03-23 10:00:00', 'confirme'),
(15, 19, 19, '2024-03-23 07:30:00', '2024-03-23 08:20:00', 'confirme'),
(16, 20, 20, '2024-03-24 05:00:00', '2024-03-24 07:20:00', 'confirme');

-- =====================================================
-- 9. TABLE tarifs (avec date_debut et date_fin ajoutées)
-- =====================================================
DROP TABLE IF EXISTS `tarifs`;
CREATE TABLE `tarifs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ligne_id` int(11) DEFAULT NULL,
  `type_client` varchar(50) DEFAULT NULL,
  `prix` float DEFAULT NULL,
  `date_debut` date DEFAULT NULL,
  `date_fin` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_tarifs_ligne` (`ligne_id`),
  KEY `idx_tarifs_periode` (`date_debut`, `date_fin`),
  CONSTRAINT `fk_tarifs_ligne` FOREIGN KEY (`ligne_id`) REFERENCES `lignes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `tarifs` (ligne_id, type_client, prix, date_debut, date_fin) VALUES
(1, 'normal', 1500, '2024-01-01', '2024-12-31'),
(1, 'etudiant', 1200, '2024-01-01', '2024-12-31'),
(2, 'normal', 2500, '2024-01-01', '2024-12-31'),
(2, 'etudiant', 2000, '2024-01-01', '2024-12-31'),
(3, 'normal', 3000, '2024-01-01', '2024-12-31'),
(3, 'etudiant', 2500, '2024-01-01', '2024-12-31'),
(4, 'normal', 2500, '2024-01-01', '2024-12-31'),
(4, 'etudiant', 2000, '2024-01-01', '2024-12-31'),
(5, 'normal', 2500, '2024-01-01', '2024-12-31'),
(5, 'etudiant', 2000, '2024-01-01', '2024-12-31'),
(6, 'normal', 2000, '2024-01-01', '2024-12-31'),
(6, 'etudiant', 1600, '2024-01-01', '2024-12-31'),
(7, 'normal', 1500, '2024-01-01', '2024-12-31'),
(7, 'etudiant', 1200, '2024-01-01', '2024-12-31'),
(8, 'normal', 5000, '2024-01-01', '2024-12-31'),
(8, 'etudiant', 4000, '2024-01-01', '2024-12-31'),
(9, 'normal', 2000, '2024-01-01', '2024-12-31'),
(9, 'etudiant', 1600, '2024-01-01', '2024-12-31'),
(10, 'normal', 2000, '2024-01-01', '2024-12-31'),
(10, 'etudiant', 1600, '2024-01-01', '2024-12-31');

-- =====================================================
-- 10. TABLE affectations
-- =====================================================
DROP TABLE IF EXISTS `affectations`;
CREATE TABLE `affectations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `chauffeur_id` int(11) DEFAULT NULL,
  `vehicule_id` int(11) DEFAULT NULL,
  `date_debut` date DEFAULT NULL,
  `date_fin` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_affectations_chauffeur` (`chauffeur_id`),
  KEY `idx_affectations_vehicule` (`vehicule_id`),
  KEY `idx_affectations_dates` (`date_debut`, `date_fin`),
  CONSTRAINT `fk_affectations_chauffeur` FOREIGN KEY (`chauffeur_id`) REFERENCES `chauffeurs` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_affectations_vehicule` FOREIGN KEY (`vehicule_id`) REFERENCES `vehicules` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `affectations` (chauffeur_id, vehicule_id, date_debut, date_fin) VALUES
(1, 1, '2024-01-01', '2024-03-31'),
(2, 2, '2024-01-01', '2024-03-31'),
(3, 3, '2024-01-15', '2024-04-15'),
(4, 4, '2024-02-01', '2024-05-01'),
(5, 5, '2024-01-01', '2024-06-30'),
(6, 6, '2024-01-10', '2024-04-10'),
(7, 7, '2024-02-15', '2024-05-15'),
(8, 8, '2024-01-20', '2024-04-20'),
(9, 9, '2024-03-01', '2024-06-01'),
(10, 10, '2024-01-05', '2024-04-05'),
(11, 11, '2024-02-10', '2024-05-10'),
(12, 12, '2024-01-25', '2024-04-25'),
(13, 13, '2024-03-05', '2024-06-05'),
(14, 14, '2024-01-15', '2024-04-15'),
(15, 15, '2024-02-20', '2024-05-20'),
(16, 16, '2024-01-08', '2024-04-08'),
(17, 17, '2024-03-10', '2024-06-10'),
(18, 18, '2024-01-30', '2024-04-30'),
(19, 19, '2024-02-25', '2024-05-25'),
(20, 20, '2024-03-15', '2024-06-15');

-- =====================================================
-- FIN DU SCRIPT
-- =====================================================
SET FOREIGN_KEY_CHECKS = 1;