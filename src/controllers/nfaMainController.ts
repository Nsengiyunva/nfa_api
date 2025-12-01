import { Request, Response } from "express";
import { NfaMain } from "../models/nfa_main";
import { NfaIndividual } from "../models/nfa_individual";
import { NfaGroupMember } from "../models/nfa_group_member";
import { NfaBlockDetail } from "../models/nfa_block_detail";
import { NfaHectareDetail } from "../models/nfa_hectare_detail";
import { NfaSpouseDetail } from "../models/nfa_spouse_detail";
import { NfaNok } from "../models/nfa_nok";

// import { NfaPlanting } from "../models/nfa_planting";
// import { NfaPayment } from "../models/nfa_payment";

// --------------------
// Create a new farmer
// --------------------
export const createFarmer = async (req: Request, res: Response) => {
  try {
    const { main, individuals, groupMembers, blockDetails, hectareDetails, spouseDetail, noks } = req.body;

    const newFarmer = await NfaMain.create(main);

    // Related data
    if (individuals?.length) {
      await NfaIndividual.bulkCreate(
        individuals.map((i: any) => ({ ...i, parentID: newFarmer.id }))
      );
    }

    if (groupMembers?.length) {
      await NfaGroupMember.bulkCreate(
        groupMembers.map((g: any) => ({ ...g, parentID: newFarmer.id }))
      );
    }

    if (blockDetails?.length) {
      await NfaBlockDetail.bulkCreate(
        blockDetails.map((b: any) => ({ ...b, parentID: newFarmer.id }))
      );
    }

    if (hectareDetails?.length) {
      await NfaHectareDetail.bulkCreate(
        hectareDetails.map((h: any) => ({ ...h, parentID: newFarmer.id }))
      );
    }

    if (spouseDetail) {
      await NfaSpouseDetail.create({ ...spouseDetail, parentID: newFarmer.id });
    }

    if (noks?.length) {
      await NfaNok.bulkCreate(
        noks.map((n: any) => ({ ...n, parentID: newFarmer.id }))
      );
    }

    res.status(201).json({ message: "Farmer created successfully", newFarmerId: newFarmer.id });
  } catch (error) {
    res.status(500).json({ error });
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
