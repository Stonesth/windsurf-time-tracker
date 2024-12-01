import { Box, Select, MenuItem } from '@mui/material';
import { useTranslation } from 'react-i18next';

const LanguageSelector = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (event: any) => {
    const language = event.target.value;
    i18n.changeLanguage(language);
  };

  return (
    <Box sx={{ minWidth: 120 }}>
      <Select
        value={i18n.language}
        onChange={changeLanguage}
        size="small"
        sx={{ 
          color: 'inherit',
          '.MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' },
        }}
      >
        <MenuItem value="en">English</MenuItem>
        <MenuItem value="fr">Français</MenuItem>
        <MenuItem value="nl">Nederlands</MenuItem>
      </Select>
    </Box>
  );
};

export default LanguageSelector;
