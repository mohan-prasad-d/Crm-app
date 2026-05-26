// ============================================
// INPUT VALIDATION UTILITY
// ============================================

const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const validatePhone = (phone) => {
  const re = /^[\d\s\-\+\(\)]{10,}$/;
  return re.test(phone);
};

const validateLead = (data) => {
  const errors = [];
  
  if (!data.name || data.name.trim().length === 0) {
    errors.push('Lead name is required');
  }
  
  if (data.email && !validateEmail(data.email)) {
    errors.push('Invalid email format');
  }
  
  if (data.phone && !validatePhone(data.phone)) {
    errors.push('Invalid phone format');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateContact = (data) => {
  const errors = [];
  
  if (!data.name || data.name.trim().length === 0) {
    errors.push('Contact name is required');
  }
  
  if (data.email && !validateEmail(data.email)) {
    errors.push('Invalid email format');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateDeal = (data) => {
  const errors = [];
  
  if (!data.title || data.title.trim().length === 0) {
    errors.push('Deal title is required');
  }
  
  if (data.value && isNaN(data.value)) {
    errors.push('Deal value must be a number');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateTask = (data) => {
  const errors = [];
  
  if (!data.title || data.title.trim().length === 0) {
    errors.push('Task title is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateUser = (data) => {
  const errors = [];
  
  if (!data.username || data.username.trim().length < 3) {
    errors.push('Username must be at least 3 characters');
  }
  
  if (!data.email || !validateEmail(data.email)) {
    errors.push('Valid email is required');
  }
  
  if (!data.password || data.password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  validateEmail,
  validatePhone,
  validateLead,
  validateContact,
  validateDeal,
  validateTask,
  validateUser
};
