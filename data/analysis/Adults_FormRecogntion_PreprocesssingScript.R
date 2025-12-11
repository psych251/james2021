library(tidyverse)

## ------------------------------------------------------------
## 0. Paths
## ------------------------------------------------------------

base_dir <- "/Users/madisonparon/Documents/GitHub/james2021/data/pilot/PilotB_rawdata"
out_path <- "/Users/madisonparon/Documents/GitHub/james2021/data/pilot/PilotB_cleandata/PilotB_recognition_combined_day1_day2.csv"

day1_file <- file.path(base_dir, "data_exp_250842-v10_task-1ie9-14710098.csv")
day2_file <- file.path(base_dir, "data_exp_250842-v10_task-2sj4-14710098.csv")

## ------------------------------------------------------------
## 1. Hard-code item → CBC / neighb (from your adult dataset)
##    Using CBC = "C" for this pilot (single condition)
## ------------------------------------------------------------

item_info <- tribble(
  ~item,    ~CBC, ~neighb,
  "peflin", "C",  "none",
  "regby",  "C",  "one",
  "dester", "C",  "many",
  "nusty",  "C",  "many",
  "mowel",  "C",  "many",
  "parung", "C",  "none",
  "pungus", "C",  "one",
  "rafar",  "C",  "one",
  "solly",  "C",  "many",
  "tabric", "C",  "one",
  "tesdar", "C",  "none",
  "vorgal", "C",  "none",
  "wabon",  "C",  "one",
  "ballow", "C",  "many",
  "femod",  "C",  "none"
)

## ------------------------------------------------------------
## 2. Function: convert one day's file → storyAdults2_formRecog-style
## ------------------------------------------------------------

convert_form_recog <- function(path, session_num) {
  
  raw <- read_csv(path, show_col_types = FALSE)
  
  resp_rows <- raw %>%
    filter(
      display == "recog-trial",
      `Screen Name` == "response"
    ) %>%
    mutate(
      # target pseudoword for this trial
      item = ANSWER,
      
      # what participant actually chose (1 or 2)
      selected = case_when(
        is.na(Response) ~ NA_character_,
        Response == correctResponse ~ ANSWER,   # chose the correct form
        TRUE ~ foil                                  # chose the foil form
      ),
      
      # accuracy as 0/1
      acc = as.integer(!is.na(selected) & selected == item),
      
      # RT in ms (from Gorilla)
      RT = `Reaction Time`,
      
      # participant ID (keep Gorilla public ID; can recode later if needed)
      ID = `Participant Public ID`,
      
      # session number = task day (1 or 2)
      session = session_num
    ) %>%
    left_join(item_info, by = "item")
  
  # Match column order of storyAdults2_formRecog: ID, CBC, item, acc, RT, session, neighb
  out <- resp_rows %>%
    transmute(
      ID,
      CBC,
      item,
      acc,
      RT,
      session,
      neighb
    )
  
  return(out)
}

## ------------------------------------------------------------
## 3. Apply to Day 1 and Day 2 and combine
## ------------------------------------------------------------

day1_form <- convert_form_recog(day1_file, session_num = 1)
day2_form <- convert_form_recog(day2_file, session_num = 2)

combined_form <- bind_rows(day1_form, day2_form)

## ------------------------------------------------------------
## 4. Save combined file in storyAdults2_formRecog format
## ------------------------------------------------------------

write_csv(combined_form, out_path)

