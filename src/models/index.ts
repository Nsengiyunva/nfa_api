import { sequelize } from "../config/database";
import { NfaMain } from "./nfa_main";
import { NfaIndividual } from "./nfa_individual";
import { NfaGroupMember } from "./nfa_group_member";
import { NfaBlockDetail } from "./nfa_block_detail";
import { NfaHectareDetail } from "./nfa_hectare_detail";
import { NfaSpouseDetail } from "./nfa_spouse_detail";
import { NfaNok } from "./nfa_nok";
import { Farmer } from "./Farmer";

// Export models
export {
  sequelize,
  NfaMain,
  NfaIndividual,
  NfaGroupMember,
  NfaBlockDetail,
  NfaHectareDetail,
  NfaSpouseDetail,
  NfaNok,
  Farmer
};
