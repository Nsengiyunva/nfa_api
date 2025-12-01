import { Request, Response } from "express";
import { NfaMain } from "../models/nfa_main";
import { NfaIndividual } from "../models/nfa_individual";
import { NfaGroupMember } from "../models/nfa_group_member";
import { NfaBlockDetail } from "../models/nfa_block_detail";
import { NfaHectareDetail } from "../models/nfa_hectare_detail";
import { NfaSpouseDetail } from "../models/nfa_spouse_detail";
import { NfaNok } from "../models/nfa_nok";
import { NfaPayment } from "../models/nfa_payment";
import { NfaPlanting } from "../models/nfa_planting";

// import { NfaPlanting } from "../models/nfa_planting";
// import { NfaPayment } from "../models/nfa_payment";

// --------------------
// Create a new farmer
// --------------------
// export const createFarmer = async (req: Request, res: Response) => {
//   try {
//     const { main, individuals, groupMembers, blockDetails, hectareDetails, spouseDetail, noks } = req.body;

//     const newFarmer = await NfaMain.create(main);

//     // Related data
//     if (individuals?.length) {
//       await NfaIndividual.bulkCreate(
//         individuals.map((i: any) => ({ ...i, parentID: newFarmer.id }))
//       );
//     }

//     if (groupMembers?.length) {
//       await NfaGroupMember.bulkCreate(
//         groupMembers.map((g: any) => ({ ...g, parentID: newFarmer.id }))
//       );
//     }

//     if (blockDetails?.length) {
//       await NfaBlockDetail.bulkCreate(
//         blockDetails.map((b: any) => ({ ...b, parentID: newFarmer.id }))
//       );
//     }

//     if (hectareDetails?.length) {
//       await NfaHectareDetail.bulkCreate(
//         hectareDetails.map((h: any) => ({ ...h, parentID: newFarmer.id }))
//       );
//     }

//     if (spouseDetail) {
//       await NfaSpouseDetail.create({ ...spouseDetail, parentID: newFarmer.id });
//     }

//     if (noks?.length) {
//       await NfaNok.bulkCreate(
//         noks.map((n: any) => ({ ...n, parentID: newFarmer.id }))
//       );
//     }

//     res.status(201).json({ message: "Farmer created successfully", newFarmerId: newFarmer.id });
//   } catch (error) {
//     res.status(500).json({ error });
//   }
// };

export const createFarmer = async (req: Request, res: Response) => {
  try {
    const { farmers } = req.body;

    for (const farmer of farmers) {
      // main parent table
      const forest = await NfaMain.create({
        licenseID: farmer.licenseID,
        issue_date: farmer.date_of_issue,
        expiry_date: farmer.expiry_date,
        referenceID: farmer.id,
        farmer_category: farmer.farmerCategory,
        farmer_type: farmer.farmerType,
        clientID: farmer.clientID,
        postal_address: farmer.postalAddress,
        physical_address: farmer.physicalAddress,
        name: farmer.name,
        primary_contact: farmer.primaryContact,
        secondary_contact: farmer.secondaryContact,
        email_address: farmer.emailAddress,
        residential_district: farmer.residentialDistrict,
        district_other: farmer.district_other,
        residential_county: farmer.residentialCounty,
        county_other: farmer.county_other,
        residential_subcounty: farmer.residentialSubcounty,
        subcounty_other: farmer.subcounty_other,
        residential_parish: farmer.residentialParish,
        parish_other: farmer.parish_other,
        residential_village: farmer.residentialVillage,
        village_other: farmer.village_other,
        tin: farmer.tin,
        status: farmer.status,
        period: farmer.period,
        documentID: farmer.documentID,
        comments: farmer.comments,
        created_by: farmer.created_by,
        created_role: farmer.created_role,
        stage: farmer.stage,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Individuals table
      if (farmer.farmerType === "INDIVIDUAL") {
        await NfaIndividual.create({
          parentID: forest.id,
          first_name: farmer.firstName,
          surname: farmer.lastName,
          middle_name: farmer.others,
          gender: farmer.gender,
          primary_contact: farmer.primaryContact,
          secondary_contact: farmer.secondaryContact,
          email_address: farmer.emailAddress,
          physical_address: farmer.physicalAddress,
          documentID: farmer.documentIDPerson,
          marital_status: farmer.maritalStatus,
          birth_date: farmer.dob,
          title: farmer.title,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      // Spouse table
      if (farmer.maritalStatus === "MARRIED") {
        await NfaSpouseDetail.create({
          parentID: forest.id,
          first_name: farmer.spouseFirstName,
          surname: farmer.spouseLastName,
          middle_name: farmer.spouseOther,
          gender: farmer.spouseGender,
          primary_contact: farmer.spouseTelephone,
          secondary_contact: farmer.spouseSecondary,
          email_address: farmer.spouseEmail,
          physical_address: farmer.spousePhysical,
          IDType: farmer.spouseIDType,
          documentID: farmer.spouseID,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      // Next of Kin table
      if (farmer.nok_lastname) {
        await NfaSpouseDetail.create({
          parentID: forest.id,
          first_name: farmer.nok_firstname,
          surname: farmer.nok_lastname,
          middle_name: farmer.nok_middlename,
          gender: farmer.nok_gender,
          primary_contact: farmer.nok_telephone,
          secondary_contact: farmer.nok_secondary,
          email_address: farmer.nok_email_address,
          nok_other: farmer.nok_other,
          relationship: farmer.nok_relationship,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      // Block details
      if (farmer.range) {
        await NfaBlockDetail.create({
          parentID: forest.id,
          range: farmer.range,
          range_other: farmer.range_other,
          sector: farmer.sector,
          sector_other: farmer.sector_other,
          beat: farmer.beat,
          beat_other: farmer.beat_other,
          reserve: farmer.forestReserve,
          reserve_other: farmer.reserve_other,
          block_number: farmer.blockNumber,
          district: farmer.district,
          block_other_district: farmer.block_other_district,
          county: farmer.county,
          block_other_county: farmer.block_other_county,
          subcounty: farmer.subcounty,
          block_other_subcounty: farmer.block_other_subcounty,
          parish: farmer.parish,
          block_other_parish: farmer.block_other_parish,
          village: farmer.village,
          block_other_village: farmer.block_other_village,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      // Hectares information
      if (farmer.period) {
        await NfaHectareDetail.create({
          parentID: forest.id,
          period: farmer.period,
          total_area_planted: farmer.total_area_planted,
          hectares_allocated: farmer.hectares_assigned,
          rateperha: farmer.rate_per_hectare,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      // Planting details
      if (farmer.seedling_source) {
        await NfaPlanting.create({
          parentID: forest.id,
          seedling_source: farmer.seedling_source,
          other_seedling_source: farmer.other_seedling_source,
          start_year: farmer.startYear,
          end_year: farmer.endYear,
          objective: farmer.objective,
          planting_rate: farmer.plantingrate,
          funding_source: farmer.fundingsource,
          species_planted: farmer.speciesPlanted,
          purpose: farmer.purpose,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      // Payment details
      if (farmer.baseline) {
        await NfaPayment.create({
          parentID: forest.id,
          baseline: farmer.baseline,
          opening_balance: farmer.opening_balance,
          amount_paid: farmer.amount_paid,
          amount_available: farmer.amount_available,
          amount_planned: farmer.amount_planned,
          amount_due: farmer.amount_due,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }

    return res.json({ success: true, message: "Farmer saved successfully" });
  } catch (error) {
    console.error("Error creating farmers:", error);
    return res.status(500).json({ success: false, error });
  }
};

// --------------------
// Get farmer by ID (with all related info)
// --------------------
export const getFarmer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const farmer = await NfaMain.findOne({
      where: { id },
      include: [
        { model: NfaIndividual, as: "individuals" },
        { model: NfaGroupMember, as: "groupMembers" },
        { model: NfaBlockDetail, as: "blockDetails" },
        { model: NfaHectareDetail, as: "hectareDetails" },
        { model: NfaSpouseDetail, as: "spouseDetail" },
        { model: NfaNok, as: "noks" },
      ],
    });

    if (!farmer) return res.status(404).json({ message: "Farmer not found" });

    res.json(farmer);
  } catch (error) {
    res.status(500).json({ error });
  }
};

// --------------------
// Update farmer by ID (main + related tables)
// --------------------
export const updateFarmer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { main, individuals, groupMembers, blockDetails, hectareDetails, spouseDetail, noks } = req.body;

    const farmer = await NfaMain.findByPk(id);
    if (!farmer) return res.status(404).json({ message: "Farmer not found" });

    await farmer.update(main);

    // Update or create related tables
    if (individuals?.length) {
      for (const i of individuals) {
        if (i.id) {
          await NfaIndividual.update(i, { where: { id: i.id } });
        } else {
          await NfaIndividual.create({ ...i, parentID: id });
        }
      }
    }

    if (groupMembers?.length) {
      for (const g of groupMembers) {
        if (g.id) {
          await NfaGroupMember.update(g, { where: { id: g.id } });
        } else {
          await NfaGroupMember.create({ ...g, parentID: id });
        }
      }
    }

    if (blockDetails?.length) {
      for (const b of blockDetails) {
        if (b.id) {
          await NfaBlockDetail.update(b, { where: { id: b.id } });
        } else {
          await NfaBlockDetail.create({ ...b, parentID: id });
        }
      }
    }

    if (hectareDetails?.length) {
      for (const h of hectareDetails) {
        if (h.id) {
          await NfaHectareDetail.update(h, { where: { id: h.id } });
        } else {
          await NfaHectareDetail.create({ ...h, parentID: id });
        }
      }
    }

    if (spouseDetail) {
      if (spouseDetail.id) {
        await NfaSpouseDetail.update(spouseDetail, { where: { id: spouseDetail.id } });
      } else {
        await NfaSpouseDetail.create({ ...spouseDetail, parentID: id });
      }
    }

    if (noks?.length) {
      for (const n of noks) {
        if (n.id) {
          await NfaNok.update(n, { where: { id: n.id } });
        } else {
          await NfaNok.create({ ...n, parentID: id });
        }
      }
    }

    res.json({ message: "Farmer updated successfully" });
  } catch (error) {
    res.status(500).json({ error });
  }
};

// --------------------
// Delete farmer by ID
// --------------------
export const deleteFarmer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Delete related tables first
    await NfaIndividual.destroy({ where: { parentID: id } });
    await NfaGroupMember.destroy({ where: { parentID: id } });
    await NfaBlockDetail.destroy({ where: { parentID: id } });
    await NfaHectareDetail.destroy({ where: { parentID: id } });
    await NfaSpouseDetail.destroy({ where: { parentID: id } });
    await NfaNok.destroy({ where: { parentID: id } });

    // Delete main farmer
    await NfaMain.destroy({ where: { id } });

    res.json({ message: "Farmer deleted successfully" });
  } catch (error) {
    res.status(500).json({ error });
  }
};
