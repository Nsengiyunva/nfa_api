// import { Router, Request, Response } from "express";
// import { authMiddleware } from "../middleware/authMiddleware";
// import {
//   NfaMain,
//   NfaIndividual,
//   NfaGroupMember,
//   NfaBlockDetail,
//   NfaHectareDetail,
//   NfaSpouseDetail,
//   NfaNok
// } from "../models";
// import { getDashboard, fetchFarmers,fetchFarmerByLicenseId, exportFarmers } from "../controllers/farmerController";
// import { getFarmer, createFarmer, updateFarmer } from "../controllers/nfaMainController";

// const router = Router();

// router.use( authMiddleware );

// router.get("/farmers/export", exportFarmers) 

// // GET all farmers with related data
// router.get("/", async (req: Request, res: Response) => {
//   try {
//     const farmers = await NfaMain.findAll({
//       include: [
//         { model: NfaIndividual, as: "individuals" },
//         { model: NfaGroupMember, as: "groupMembers" },
//         { model: NfaBlockDetail, as: "blockDetails" },
//         { model: NfaHectareDetail, as: "hectareDetails" },
//         { model: NfaSpouseDetail, as: "spouseDetail" },
//         { model: NfaNok, as: "noks" }
//       ]
//     });
//     res.json(farmers);
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error });
//   }
// });

// // GET single farmer by ID with related data
// router.get("/farmers/:id", getFarmer);

// //add farmer
// router.post("/create", createFarmer);

// // DELETE farmer
// router.delete("/:id", async (req: Request, res: Response) => {
//   try {
//     const farmer = await NfaMain.findByPk(req.params.id);
//     if (!farmer) return res.status(404).json({ message: "Farmer not found" });

//     await farmer.destroy();
//     res.json({ message: "Farmer deleted" });
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error });
//   }
// });

// router.get("/stats/dashboard", getDashboard);
// router.get("/all/farmers", fetchFarmers );
// router.put("/farmer/:id", updateFarmer);
// router.get("/farmer/details", fetchFarmerByLicenseId);


// export default router;


import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  NfaMain,
  NfaIndividual,
  NfaGroupMember,
  NfaBlockDetail,
  NfaHectareDetail,
  NfaSpouseDetail,
  NfaNok
} from "../models";
import { getDashboard, fetchFarmers, fetchFarmerByLicenseId, exportFarmersCSV } from "../controllers/farmerController";
import { getFarmer, createFarmer, updateFarmer } from "../controllers/nfaMainController";

const router = Router();

router.use(authMiddleware);

// ── Static / exact routes FIRST (before any param routes) ─────────────────────
router.get("/export_farmers/", exportFarmersCSV)          
router.get("/farmer/details", fetchFarmerByLicenseId) 
router.get("/stats/dashboard", getDashboard)         
router.get("/all/farmers", fetchFarmers) 

// ── CRUD ───────────────────────────────────────────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  try {
    const farmers = await NfaMain.findAll({
      include: [
        { model: NfaIndividual,    as: "individuals"   },
        { model: NfaGroupMember,   as: "groupMembers"  },
        { model: NfaBlockDetail,   as: "blockDetails"  },
        { model: NfaHectareDetail, as: "hectareDetails"},
        { model: NfaSpouseDetail,  as: "spouseDetail"  },
        { model: NfaNok,           as: "noks"          },
      ],
    });
    res.json(farmers);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

router.post("/create", createFarmer);
router.put("/farmer/:id", updateFarmer);

// ── Param routes LAST (so "export", "details" etc. aren't swallowed as :id) ───
router.get("/farmers/:id", getFarmer);
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const farmer = await NfaMain.findByPk(req.params.id);
    if (!farmer) return res.status(404).json({ message: "Farmer not found" });
    await farmer.destroy();
    res.json({ message: "Farmer deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

export default router;